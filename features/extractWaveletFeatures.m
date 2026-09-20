function features = extractWaveletFeatures(x, Fs)

% ============================================================
% WAVELET-BASED FEATURE EXTRACTION
% ============================================================

x = x(:);

x = x - mean(x);

x = x ./ (max(abs(x)) + eps);

waveletName = 'sym8';

% ------------------------------------------------------------
% Determine decomposition level
% ------------------------------------------------------------

N = length(x);

maxLevel = wmaxlev(N,waveletName);

if maxLevel < 1
    error('Signal is too short for wavelet decomposition.');
end

decompositionLevel = min(5,maxLevel);

% ------------------------------------------------------------
% Wavelet decomposition
% ------------------------------------------------------------

[C,L] = wavedec(x,decompositionLevel,waveletName);

% ------------------------------------------------------------
% Approximation coefficient energy
% ------------------------------------------------------------

approximation = appcoef( ...
    C,L,waveletName,decompositionLevel);

approxEnergy = sum(approximation.^2);

% ------------------------------------------------------------
% Detail energies
% ------------------------------------------------------------

detailEnergy = zeros(decompositionLevel,1);

detailEntropy = zeros(decompositionLevel,1);

for level = 1:decompositionLevel

    detail = detcoef(C,L,level);

    detailEnergy(level) = sum(detail.^2);

    probability = detail.^2 ./ ...
        (sum(detail.^2) + eps);

    detailEntropy(level) = ...
        -sum(probability .* log2(probability + eps));

end

% ------------------------------------------------------------
% Total wavelet energy
% ------------------------------------------------------------

totalEnergy = approxEnergy + sum(detailEnergy);

% ------------------------------------------------------------
% Relative energies
% ------------------------------------------------------------

relativeApproxEnergy = ...
    approxEnergy / (totalEnergy + eps);

relativeDetailEnergy = ...
    detailEnergy / (totalEnergy + eps);

% ------------------------------------------------------------
% Store features
% ------------------------------------------------------------

features.WaveletApproxEnergy = relativeApproxEnergy;

for level = 1:decompositionLevel

    features.(sprintf('WaveletDetailEnergy_L%d',level)) = ...
        relativeDetailEnergy(level);

    features.(sprintf('WaveletEntropy_L%d',level)) = ...
        detailEntropy(level);

end

% ------------------------------------------------------------
% Global wavelet entropy
% ------------------------------------------------------------

allEnergy = [approxEnergy; detailEnergy];

p = allEnergy ./ (sum(allEnergy) + eps);

globalEntropy = ...
    -sum(p .* log2(p + eps));

features.WaveletGlobalEntropy = globalEntropy;

end