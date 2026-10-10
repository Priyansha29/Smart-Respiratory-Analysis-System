function [M, meta] = mfccMatrix(x, Fs)
%MFCCMATRIX  Mel-frequency cepstral coefficient matrix (frames x 13).
%
%   Mirrors the parameters of the research features/extractMFCCFeatures.m
%   (13 coefficients, 26 mel filters, <=512-sample Hamming frames with 50%
%   overlap, pre-emphasis 0.97) so the dashboard heat-map reflects the same
%   transform used for training. This is a NEW, read-only helper; the
%   research function itself is untouched.

x = double(x(:));
x = x - mean(x);
N = numel(x);
if N < 128
    error('Signal too short for MFCC extraction.');
end

numCoefficients = 13;
numFilters      = 26;

frameLength = min(512, N);
frameLength = max(frameLength, 128);
if frameLength > N
    frameLength = N;
end
hopLength = floor(frameLength / 2);
NFFT      = 2^nextpow2(frameLength);

% pre-emphasis
preEmphasis = 0.97;
xPre = zeros(size(x));
xPre(1) = x(1);
xPre(2:end) = x(2:end) - preEmphasis * x(1:end-1);
if numel(xPre) < frameLength
    xPre(end+1:frameLength) = 0;
end
numFrames = 1 + floor((numel(xPre) - frameLength) / hopLength);
if numFrames < 1
    numFrames = 1;
end

window = hamming(frameLength);

% mel filter bank
melMin  = 0;
melMax  = 2595 * log10(1 + (Fs/2)/700);
melPoints = linspace(melMin, melMax, numFilters + 2);
hzPoints  = 700 * (10.^(melPoints/2595) - 1);
binPoints = floor((NFFT + 1) * hzPoints / Fs);
binPoints = max(binPoints, 0);
binPoints = min(binPoints, floor(NFFT/2));

filterBank = zeros(numFilters, NFFT/2 + 1);
for m = 2:numFilters + 1
    leftBin   = binPoints(m-1);
    centerBin = binPoints(m);
    rightBin  = binPoints(m+1);
    if centerBin > leftBin
        for k = leftBin:centerBin
            filterBank(m-1, k+1) = (k - leftBin) / (centerBin - leftBin);
        end
    end
    if rightBin > centerBin
        for k = centerBin:rightBin
            filterBank(m-1, k+1) = (rightBin - k) / (rightBin - centerBin);
        end
    end
end

M = zeros(numFrames, numCoefficients);
for frame = 1:numFrames
    startIndex = (frame-1)*hopLength + 1;
    endIndex   = startIndex + frameLength - 1;
    frameSignal = zeros(frameLength, 1);
    if startIndex <= numel(xPre)
        availableEnd = min(endIndex, numel(xPre));
        sourceLength = availableEnd - startIndex + 1;
        frameSignal(1:sourceLength) = xPre(startIndex:availableEnd);
    end
    frameSignal = frameSignal .* window;

    spectrum      = fft(frameSignal, NFFT);
    powerSpectrum = abs(spectrum(1:NFFT/2+1)).^2;
    powerSpectrum = powerSpectrum / NFFT;

    melEnergy    = filterBank * powerSpectrum;
    melEnergy    = max(melEnergy, eps);
    logMelEnergy = log(melEnergy);

    for coefficient = 1:numCoefficients
        dctSum = 0;
        for m = 1:numFilters
            dctSum = dctSum + logMelEnergy(m) * ...
                cos(pi * coefficient * (m - 0.5) / numFilters);
        end
        M(frame, coefficient) = dctSum;
    end
end

M(~isfinite(M)) = 0;

meta = struct('numFrames', numFrames, 'frameLength', frameLength, ...
              'hopLength', hopLength, 'NFFT', NFFT);
end
