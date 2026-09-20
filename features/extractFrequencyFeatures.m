function features = extractFrequencyFeatures(x, Fs)

% ============================================================
% FREQUENCY-DOMAIN FEATURE EXTRACTION
% ============================================================

% Force signal to column vector
x = x(:);

% Remove DC component
x = x - mean(x);

N = length(x);

if N < 4
    error('Signal is too short for frequency analysis.');
end

% ============================================================
% FFT
% ============================================================

NFFT = 2^nextpow2(N);

X = fft(x, NFFT);

% One-sided magnitude spectrum
P2 = abs(X / N);

P1 = P2(1:NFFT/2+1);

if length(P1) > 2
    P1(2:end-1) = 2 * P1(2:end-1);
end

% IMPORTANT:
% Force frequency and spectrum to COLUMN vectors
f = Fs * (0:(NFFT/2)) / NFFT;
f = f(:);

P1 = P1(:);

% ============================================================
% POWER SPECTRUM
% ============================================================

powerSpectrum = P1.^2;

powerSpectrum = powerSpectrum(:);

totalPower = sum(powerSpectrum) + eps;

% ============================================================
% DOMINANT FREQUENCY
% ============================================================

[~, index] = max(P1);

dominantFrequency = f(index);

% ============================================================
% SPECTRAL CENTROID
% ============================================================

spectralCentroid = ...
    sum(f .* powerSpectrum) / totalPower;

% Make absolutely sure it is scalar
spectralCentroid = double(spectralCentroid(1));

% ============================================================
% SPECTRAL SPREAD / BANDWIDTH
% ============================================================

frequencyDifference = f - spectralCentroid;

spectralSpread = sqrt( ...
    sum((frequencyDifference.^2) .* powerSpectrum) ...
    / totalPower);

spectralSpread = double(spectralSpread(1));

% ============================================================
% SPECTRAL SKEWNESS
% ============================================================

spectralSkewness = ...
    sum((frequencyDifference.^3) .* powerSpectrum) ...
    / (totalPower * (spectralSpread^3 + eps));

spectralSkewness = double(spectralSkewness(1));

% ============================================================
% SPECTRAL KURTOSIS
% ============================================================

spectralKurtosis = ...
    sum((frequencyDifference.^4) .* powerSpectrum) ...
    / (totalPower * (spectralSpread^4 + eps));

spectralKurtosis = double(spectralKurtosis(1));

% ============================================================
% SPECTRAL ROLLOFF
% ============================================================

cumulativeEnergy = cumsum(powerSpectrum);

rolloffThreshold = ...
    0.85 * cumulativeEnergy(end);

rolloffIndex = ...
    find(cumulativeEnergy >= rolloffThreshold,1);

if isempty(rolloffIndex)

    rolloffFrequency = f(end);

else

    rolloffFrequency = f(rolloffIndex);

end

rolloffFrequency = double(rolloffFrequency(1));

% ============================================================
% SPECTRAL FLATNESS
% ============================================================

geometricMean = ...
    exp(mean(log(powerSpectrum + eps)));

arithmeticMean = ...
    mean(powerSpectrum + eps);

spectralFlatness = ...
    geometricMean / arithmeticMean;

% ============================================================
% SPECTRAL ENTROPY
% ============================================================

probability = ...
    powerSpectrum / totalPower;

spectralEntropy = ...
    -sum(probability .* log2(probability + eps));

spectralEntropy = double(spectralEntropy(1));

% ============================================================
% FREQUENCY BAND ENERGIES
% ============================================================

bands = [
     100   250
     250   500
     500  1000
    1000  1500
    1500  2000
    2000  2500
];

bandEnergy = zeros(size(bands,1),1);

for k = 1:size(bands,1)

    lowerFreq = bands(k,1);

    upperFreq = min(bands(k,2),Fs/2);

    if lowerFreq >= Fs/2

        bandEnergy(k) = 0;

    else

        mask = ...
            f >= lowerFreq & ...
            f < upperFreq;

        bandEnergy(k) = ...
            sum(powerSpectrum(mask));

    end

end

% ============================================================
% RELATIVE BAND ENERGY
% ============================================================

relativeBandEnergy = ...
    bandEnergy / totalPower;

% ============================================================
% STORE FEATURES
% ============================================================

features.DominantFrequency = dominantFrequency;

features.SpectralCentroid = spectralCentroid;

features.SpectralSpread = spectralSpread;

features.SpectralSkewness = spectralSkewness;

features.SpectralKurtosis = spectralKurtosis;

features.SpectralRolloff = rolloffFrequency;

features.SpectralFlatness = spectralFlatness;

features.SpectralEntropy = spectralEntropy;

features.BandEnergy_100_250 = ...
    relativeBandEnergy(1);

features.BandEnergy_250_500 = ...
    relativeBandEnergy(2);

features.BandEnergy_500_1000 = ...
    relativeBandEnergy(3);

features.BandEnergy_1000_1500 = ...
    relativeBandEnergy(4);

features.BandEnergy_1500_2000 = ...
    relativeBandEnergy(5);

features.BandEnergy_2000_2500 = ...
    relativeBandEnergy(6);

end