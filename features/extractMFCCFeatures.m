function features = extractMFCCFeatures(x, Fs)

% ============================================================
% MFCC FEATURE EXTRACTION
% IMPLEMENTED MANUALLY
% DOES NOT REQUIRE AUDIO TOOLBOX
% ============================================================

% Force column vector
x = x(:);

% Remove DC
x = x - mean(x);

N = length(x);

if N < 128
    error('Signal is too short for MFCC extraction.');
end

% ============================================================
% PARAMETERS
% ============================================================

numCoefficients = 13;
numFilters = 26;

% Adaptive frame length
frameLength = min(512,N);

% Make frame length reasonable
frameLength = max(frameLength,128);

if frameLength > N
    frameLength = N;
end

% 50% overlap
hopLength = floor(frameLength/2);

% FFT size
NFFT = 2^nextpow2(frameLength);

% ============================================================
% PRE-EMPHASIS
% ============================================================

preEmphasis = 0.97;

xPre = zeros(size(x));

xPre(1) = x(1);

xPre(2:end) = ...
    x(2:end) - preEmphasis*x(1:end-1);

% ============================================================
% NUMBER OF FRAMES
% ============================================================

if length(xPre) < frameLength

    xPre(end+1:frameLength) = 0;

end

numFrames = ...
    1 + floor((length(xPre)-frameLength)/hopLength);

if numFrames < 1
    numFrames = 1;
end

% ============================================================
% HAMMING WINDOW
% ============================================================

window = hamming(frameLength);

% ============================================================
% MEL SCALE FUNCTIONS
% ============================================================

melMin = 0;

melMax = ...
    2595 * log10(1 + (Fs/2)/700);

melPoints = linspace( ...
    melMin, ...
    melMax, ...
    numFilters + 2);

% Convert Mel → Hz

hzPoints = ...
    700 * (10.^(melPoints/2595) - 1);

% Convert Hz → FFT bins

binPoints = floor( ...
    (NFFT + 1) * hzPoints / Fs);

% Keep bins inside valid FFT range

binPoints = max(binPoints,0);

binPoints = min(binPoints,floor(NFFT/2));

% ============================================================
% MEL FILTER BANK
% ============================================================

filterBank = zeros(numFilters,NFFT/2+1);

for m = 2:numFilters+1

    leftBin = binPoints(m-1);

    centerBin = binPoints(m);

    rightBin = binPoints(m+1);

    % Increasing slope
    if centerBin > leftBin

        for k = leftBin:centerBin

            index = k + 1;

            filterBank(m-1,index) = ...
                (k-leftBin) / ...
                (centerBin-leftBin);

        end

    end

    % Decreasing slope
    if rightBin > centerBin

        for k = centerBin:rightBin

            index = k + 1;

            filterBank(m-1,index) = ...
                (rightBin-k) / ...
                (rightBin-centerBin);

        end

    end

end

% ============================================================
% MFCC MATRIX
% ============================================================

mfccMatrix = zeros( ...
    numFrames, ...
    numCoefficients);

% ============================================================
% PROCESS EACH FRAME
% ============================================================

for frame = 1:numFrames

    startIndex = ...
        (frame-1)*hopLength + 1;

    endIndex = ...
        startIndex + frameLength - 1;

    % Extract frame
    frameSignal = zeros(frameLength,1);

    if startIndex <= length(xPre)

        availableEnd = ...
            min(endIndex,length(xPre));

        sourceLength = ...
            availableEnd-startIndex+1;

        frameSignal(1:sourceLength) = ...
            xPre(startIndex:availableEnd);

    end

    % Apply Hamming window
    frameSignal = ...
        frameSignal .* window;

    % --------------------------------------------------------
    % FFT
    % --------------------------------------------------------

    spectrum = fft(frameSignal,NFFT);

    powerSpectrum = ...
        abs(spectrum(1:NFFT/2+1)).^2;

    powerSpectrum = ...
        powerSpectrum / NFFT;

    % --------------------------------------------------------
    % Mel filter bank
    % --------------------------------------------------------

    melEnergy = ...
        filterBank * powerSpectrum;

    % Avoid log(0)
    melEnergy = ...
        max(melEnergy,eps);

    % Log energy
    logMelEnergy = ...
        log(melEnergy);

    % --------------------------------------------------------
    % DCT
    % --------------------------------------------------------

    for coefficient = 1:numCoefficients

        dctSum = 0;

        for m = 1:numFilters

            dctSum = dctSum + ...
                logMelEnergy(m) * ...
                cos( ...
                pi*coefficient* ...
                (m-0.5)/numFilters);

        end

        mfccMatrix(frame,coefficient) = dctSum;

    end

end

% ============================================================
% CLEAN VALUES
% ============================================================

mfccMatrix(~isfinite(mfccMatrix)) = 0;

% ============================================================
% DELTA MFCC
% ============================================================

if size(mfccMatrix,1) > 1

    deltaMFCC = diff(mfccMatrix);

    % Maintain same number of frames
    deltaMFCC = [
        deltaMFCC
        deltaMFCC(end,:)
        ];

else

    deltaMFCC = ...
        zeros(size(mfccMatrix));

end

% ============================================================
% STATISTICAL FEATURE SUMMARY
% ============================================================

for k = 1:numCoefficients

    features.( ...
        sprintf('MFCC%d_Mean',k)) = ...
        mean(mfccMatrix(:,k));

    features.( ...
        sprintf('MFCC%d_Std',k)) = ...
        std(mfccMatrix(:,k));

    features.( ...
        sprintf('MFCC%d_DeltaMean',k)) = ...
        mean(deltaMFCC(:,k));

    features.( ...
        sprintf('MFCC%d_DeltaStd',k)) = ...
        std(deltaMFCC(:,k));

end

end