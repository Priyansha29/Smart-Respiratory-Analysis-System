function w = waveletLevels(x)
%WAVELETLEVELS  Per-level wavelet decomposition for the dashboard view.
%
%   Mirrors the decomposition used by features/extractWaveletFeatures.m
%   (sym8, level = min(5, wmaxlev(N,'sym8'))) and returns the same relative
%   sub-band energies plus per-level entropies. New read-only helper; the
%   research function is untouched.

x = double(x(:));
x = x - mean(x);
x = x ./ (max(abs(x)) + eps);

waveletName = 'sym8';
N = numel(x);
maxLevel = wmaxlev(N, waveletName);
if maxLevel < 1
    error('Signal is too short for wavelet decomposition.');
end
level = min(5, maxLevel);

[C, L] = wavedec(x, level, waveletName);
approximation = appcoef(C, L, waveletName, level);
approxEnergy  = sum(approximation.^2);

detailEnergy  = zeros(level, 1);
detailEntropy = zeros(level, 1);
for k = 1:level
    d = detcoef(C, L, k);
    detailEnergy(k) = sum(d.^2);
    p = d.^2 ./ (sum(d.^2) + eps);
    detailEntropy(k) = -sum(p .* log2(p + eps));
end

totalEnergy = approxEnergy + sum(detailEnergy);
relApprox   = approxEnergy / (totalEnergy + eps);
relDetail   = detailEnergy / (totalEnergy + eps);

labels = "Approx (A" + string(level) + ")";
for k = level:-1:1
    labels(end+1) = "Detail D" + string(k); %#ok<AGROW>
end
energies  = [relApprox; relDetail(end:-1:1)];
entropies = [0; detailEntropy(end:-1:1)];

w = struct('labels', labels(:)', ...
           'energies', energies(:)', ...
           'entropies', entropies(:)');
end
