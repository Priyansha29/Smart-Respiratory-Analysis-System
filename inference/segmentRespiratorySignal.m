function seg = segmentRespiratorySignal(x, Fs, opts)
%SEGMENTRESPIRATORYSIGNAL  Annotation-free respiratory phase segmentation.
%
%   seg = SEGMENTRESPIRATORYSIGNAL(x, Fs, opts)
%
%   The research pipeline segments ICBHI recordings with clinical
%   annotation (.txt) files. Arbitrary website uploads do not have those
%   files, so this inference-only helper approximates respiratory phases
%   from the signal energy envelope.
%
%   LIMITATIONS (documented, not hidden):
%     * It is a heuristic, NOT clinically validated segmentation.
%     * Detected phases may not align exactly with inspiration/expiration
%       as defined by the ICBHI annotations.
%     * A fixed-window fallback is used only when no phase is detected.
%
%   This function does not modify or replace extractRespiratoryCycles.m.
%
%   Inputs:
%     x    - preprocessed (band-pass filtered) column signal
%     Fs   - sampling rate (Hz)
%     opts - optional fields: minSegSec, mergeGapSec, maxSegSec,
%            thresholdFrac, fallbackSec, fallbackHopSec

if nargin < 3 || isempty(opts)
    opts = struct();
end
if ~isfield(opts, 'minSegSec'),      opts.minSegSec = 0.6;  end
if ~isfield(opts, 'mergeGapSec'),    opts.mergeGapSec = 0.12; end
if ~isfield(opts, 'maxSegSec'),      opts.maxSegSec = 4.0;  end
if ~isfield(opts, 'thresholdFrac'),  opts.thresholdFrac = 0.25; end
if ~isfield(opts, 'fallbackSec'),    opts.fallbackSec = 3.0; end
if ~isfield(opts, 'fallbackHopSec'), opts.fallbackHopSec = 1.5; end

x = double(x(:));
N = numel(x);
segTemplate = struct('index', 0, 'startSec', 0, 'endSec', 0, ...
                     'durationSec', 0, 'phase', 'Inspiration');
seg = segTemplate([]);

if N == 0
    return;
end

% ---- energy envelope (50 ms moving RMS of the absolute signal) ----------
win = max(1, round(0.05 * Fs));
kernel = ones(win, 1) / win;
env = filter(kernel, 1, abs(x));
env = env(:);

med = median(env);
% Robust high reference: 90th percentile of the envelope. Using the absolute
% max lets a single loud artifact dominate the threshold and exclude most of
% an otherwise continuous recording; the percentile is stable.
e = sort(env);
hi = e(max(1, min(numel(e), round(0.9 * numel(e)))));
thr = med + opts.thresholdFrac * (hi - med);
if ~isfinite(thr) || thr <= med
    thr = med + 0.1 * max(hi - med, eps);
end

mask = env > thr;
mask = closeGaps(mask, round(opts.mergeGapSec * Fs));
[starts, ends] = runsOf(mask);

% ---- duration filter ----------------------------------------------------
minLen = round(opts.minSegSec * Fs);
keep = (ends - starts + 1) >= minLen;
starts = starts(keep);
ends   = ends(keep);

segs = mergeClose(starts, ends, round(opts.mergeGapSec * Fs));
segs = splitLong(segs, round(opts.maxSegSec * Fs));

% ---- fallback: fixed windows (documented approximation) -----------------
if isempty(segs)
    L = round(opts.fallbackSec * Fs);
    H = round(opts.fallbackHopSec * Fs);
    if N <= L
        segs = [1, N];
    else
        s = 1;
        while true
            e = min(N, s + L - 1);
            segs = [segs; s, e]; %#ok<AGROW>
            if e >= N
                break;
            end
            s = s + H;
        end
    end
end

% ---- assemble -----------------------------------------------------------
n = size(segs, 1);
for i = 1:n
    s = max(1, segs(i, 1));
    e = min(N, segs(i, 2));
    seg(i).index       = i;
    seg(i).startSec    = (s - 1) / Fs;
    seg(i).endSec      = e / Fs;
    seg(i).durationSec = (e - s + 1) / Fs;
    % Heuristic phase label: alternate detected energy excursions.
    if mod(i, 2) == 1
        seg(i).phase = 'Inspiration';
    else
        seg(i).phase = 'Expiration';
    end
end
end

% ------------------------------------------------------------------------
function [starts, ends] = runsOf(mask)
mask = logical(mask(:));
d = diff([false; mask; false]);
starts = find(d == 1);
ends   = find(d == -1) - 1;
end

% ------------------------------------------------------------------------
function mask = closeGaps(mask, gapLen)
if gapLen <= 0
    return;
end
mask = logical(mask(:));
idx = find(mask);
if isempty(idx)
    return;
end
% Fill runs of false shorter than gapLen between true samples.
d = diff([false; mask; false]);
starts = find(d == 1);
ends   = find(d == -1) - 1;
for k = 1:numel(starts) - 1
    gap = starts(k + 1) - ends(k) - 1;
    if gap > 0 && gap <= gapLen
        mask(ends(k) + 1 : starts(k + 1) - 1) = true;
    end
end
end

% ------------------------------------------------------------------------
function segs = mergeClose(starts, ends, gapLen)
segs = [starts(:), ends(:)];
if isempty(segs)
    return;
end
merged = segs(1, :);
for k = 2:size(segs, 1)
    if segs(k, 1) - merged(end, 2) - 1 <= gapLen
        merged(end, 2) = max(merged(end, 2), segs(k, 2));
    else
        merged = [merged; segs(k, :)]; %#ok<AGROW>
    end
end
segs = merged;
end

% ------------------------------------------------------------------------
function segs = splitLong(segs, maxLen)
if maxLen <= 0 || isempty(segs)
    return;
end
out = zeros(0, 2);
for k = 1:size(segs, 1)
    s = segs(k, 1);
    e = segs(k, 2);
    while (e - s + 1) > maxLen
        out(end + 1, :) = [s, s + maxLen - 1]; %#ok<AGROW>
        s = s + maxLen;
    end
    if e >= s
        out(end + 1, :) = [s, e]; %#ok<AGROW>
    end
end
segs = out;
end
