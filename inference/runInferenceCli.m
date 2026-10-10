function runInferenceCli(wavPath, outJsonPath, opts)
%RUNINFERENCECLI  One-shot inference used by tests and manual checks.
%
%   runInferenceCli(wavPath, outJsonPath)
%   runInferenceCli(wavPath, outJsonPath, opts)
%
%   Loads the models, analyses one WAV, and writes the wrapped JSON result
%   ({"ok":true,"result":{...}}) to outJsonPath. This is the single-shot
%   equivalent of one inferenceWorker job and is handy for verification and
%   for debugging without the FastAPI layer.

if nargin < 3 || isempty(opts)
    opts = struct();
end

thisDir = fileparts(mfilename('fullpath'));
root = fileparts(thisDir);
addpath(root, ...
    fullfile(root, 'preprocessing'), fullfile(root, 'segmentation'), ...
    fullfile(root, 'features'), fullfile(root, 'machine_learning'), ...
    fullfile(root, 'analysis'), fullfile(root, 'inference'));
set(0, 'DefaultFigureVisible', 'off');

try
    ctx = inferenceInit(root);
    result = analyzeRespiratoryRecording(wavPath, ctx, opts);
    writeJsonAtomic(outJsonPath, struct('ok', true, 'result', result));
catch ME
    writeJsonAtomic(outJsonPath, struct('ok', false, ...
        'error', ME.message, 'identifier', ME.identifier));
end
end

% ------------------------------------------------------------------------
function writeJsonAtomic(path, value)
tmp = [path '.tmp'];
fid = fopen(tmp, 'w', 'n', 'UTF-8');
if fid < 0
    error('inference:cliWrite', 'Cannot write to %s', tmp);
end
fwrite(fid, jsonencode(value), 'char');
fclose(fid);
if isfile(path)
    delete(path);
end
movefile(tmp, path);
end
