function [featureVector,featureNames,featureStruct] = ...
    extractAllFeatures(x,Fs)

% ============================================================
% COMPLETE FEATURE FUSION ENGINE
% ============================================================

% ------------------------------------------------------------
% Extract individual feature groups
% ------------------------------------------------------------

timeFeatures = extractTimeFeatures(x,Fs);

frequencyFeatures = extractFrequencyFeatures(x,Fs);

stftFeatures = extractSTFTFeatures(x,Fs);

mfccFeatures = extractMFCCFeatures(x,Fs);

waveletFeatures = extractWaveletFeatures(x,Fs);

% ------------------------------------------------------------
% Remove visualization-only STFT fields
% ------------------------------------------------------------

if isfield(stftFeatures,'STFT_Frequency')
    stftFeatures = rmfield(stftFeatures,'STFT_Frequency');
end

if isfield(stftFeatures,'STFT_Time')
    stftFeatures = rmfield(stftFeatures,'STFT_Time');
end

if isfield(stftFeatures,'STFT_Matrix')
    stftFeatures = rmfield(stftFeatures,'STFT_Matrix');
end

% ------------------------------------------------------------
% Combine structures
% ------------------------------------------------------------

featureStruct = struct();

groups = {
    timeFeatures
    frequencyFeatures
    stftFeatures
    mfccFeatures
    waveletFeatures
    };

for g = 1:length(groups)

    currentGroup = groups{g};

    fieldNames = fieldnames(currentGroup);

    for k = 1:length(fieldNames)

        name = fieldNames{k};

        featureStruct.(name) = ...
            currentGroup.(name);

    end

end

% ------------------------------------------------------------
% Convert structure → vector
% ------------------------------------------------------------

featureNames = fieldnames(featureStruct);

featureVector = zeros(1,length(featureNames));

for k = 1:length(featureNames)

    value = featureStruct.(featureNames{k});

    % Safety check
    if isscalar(value) && isfinite(value)

        featureVector(k) = value;

    else

        featureVector(k) = 0;

    end

end

end