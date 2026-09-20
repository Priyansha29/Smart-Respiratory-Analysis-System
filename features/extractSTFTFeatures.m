function features = extractSTFTFeatures(x, Fs)

% ============================================================
% TIME-FREQUENCY / STFT FEATURE EXTRACTION
% ============================================================

x = x(:);
x = x - mean(x);

N = length(x);

if N < 64
    error('Signal is too short for STFT analysis.');
end

% ------------------------------------------------------------
% Adaptive window
% ------------------------------------------------------------

windowLength = min(512,N);

if windowLength < 64
    windowLength = N;
end

window = hamming(windowLength);

overlapLength = floor(0.5 * windowLength);

if overlapLength >= windowLength
    overlapLength = floor(windowLength/2);
end

NFFT = max(512,2^nextpow2(windowLength));

% ------------------------------------------------------------
% STFT
% ------------------------------------------------------------

[S,F,T] = spectrogram( ...
    x, ...
    window, ...
    overlapLength, ...
    NFFT, ...
    Fs);

magnitude = abs(S);

powerMatrix = magnitude.^2;

% ------------------------------------------------------------
% Frame-wise spectral centroid
% ------------------------------------------------------------

centroidValues = zeros(1,size(powerMatrix,2));

for i = 1:size(powerMatrix,2)

    framePower = powerMatrix(:,i);

    totalFramePower = sum(framePower) + eps;

    centroidValues(i) = ...
        sum(F .* framePower) / totalFramePower;

end

% ------------------------------------------------------------
% Frame-wise dominant frequency
% ------------------------------------------------------------

dominantFrequency = zeros(1,size(powerMatrix,2));

for i = 1:size(powerMatrix,2)

    [~,idx] = max(powerMatrix(:,i));

    dominantFrequency(i) = F(idx);

end

% ------------------------------------------------------------
% Spectral flux
% ------------------------------------------------------------

normalizedSpectrum = ...
    powerMatrix ./ ...
    (sum(powerMatrix,1) + eps);

spectralFlux = zeros(1,size(powerMatrix,2));

for i = 2:size(normalizedSpectrum,2)

    difference = ...
        normalizedSpectrum(:,i) - ...
        normalizedSpectrum(:,i-1);

    spectralFlux(i) = sqrt(sum(difference.^2));

end

% ------------------------------------------------------------
% Time-frequency entropy
% ------------------------------------------------------------

frameEntropy = zeros(1,size(powerMatrix,2));

for i = 1:size(powerMatrix,2)

    p = powerMatrix(:,i);

    p = p ./ (sum(p) + eps);

    frameEntropy(i) = ...
        -sum(p .* log2(p + eps));

end

% ------------------------------------------------------------
% Summary statistics
% ------------------------------------------------------------

features.STFT_Centroid_Mean = mean(centroidValues);
features.STFT_Centroid_Std = std(centroidValues);

features.STFT_DominantFreq_Mean = mean(dominantFrequency);
features.STFT_DominantFreq_Std = std(dominantFrequency);

features.SpectralFlux_Mean = mean(spectralFlux);
features.SpectralFlux_Std = std(spectralFlux);

features.STFT_Entropy_Mean = mean(frameEntropy);
features.STFT_Entropy_Std = std(frameEntropy);

features.STFT_TimeDuration = T(end);

% ------------------------------------------------------------
% Save STFT for visualization
% ------------------------------------------------------------

features.STFT_Frequency = F;
features.STFT_Time = T;
features.STFT_Matrix = magnitude;

end