function [X,Y,metadata,featureNames] = ...
    buildFeatureMatrix(dataset,dataFolder)

% ============================================================
% COMPLETE FEATURE MATRIX BUILDER
% ============================================================

fprintf('\n');
fprintf('============================================\n');
fprintf('BUILDING RESPIRATORY SOUND FEATURE MATRIX\n');
fprintf('============================================\n');

X = [];
Y = categorical();
metadata = table();

featureNames = {};

totalCycles = 0;
validCycles = 0;

% ------------------------------------------------------------
% Loop through recordings
% ------------------------------------------------------------

for fileIndex = 1:height(dataset)

    filename = char(dataset.FileName(fileIndex));

    wavFile = fullfile(dataFolder,filename);

    [x,Fs] = audioread(wavFile);

    % Convert stereo to mono
    if size(x,2) > 1
        x = mean(x,2);
    end

    % --------------------------------------------------------
    % Preprocessing
    % --------------------------------------------------------

    try

        [xProcessed,~,~] = preprocessSignal(x,Fs);

    catch

        warning('Preprocessing failed for %s. Skipping.',filename);

        continue;

    end

    % --------------------------------------------------------
    % Annotation file
    % --------------------------------------------------------

    [~,baseName,~] = fileparts(filename);

    annotationFile = ...
        fullfile(dataFolder,[baseName,'.txt']);

    if ~isfile(annotationFile)

        warning('Annotation missing: %s',filename);

        continue;

    end

    annotations = ...
        readICBHIAnnotation(annotationFile);

    % --------------------------------------------------------
    % Extract respiratory cycles
    % --------------------------------------------------------

    cycles = extractRespiratoryCycles( ...
        xProcessed, ...
        Fs, ...
        annotations);

    totalCycles = totalCycles + length(cycles);

    % --------------------------------------------------------
    % Process each cycle
    % --------------------------------------------------------

    for cycleIndex = 1:length(cycles)

        cycleSignal = cycles(cycleIndex).Signal;

        % Avoid extremely short signals
        if length(cycleSignal) < 128
            continue;
        end

        try

            [vector,names,~] = ...
                extractAllFeatures(cycleSignal,Fs);

        catch ME

            warning( ...
                'Feature extraction failed: %s | %s', ...
                filename,ME.message);

            continue;

        end

        % ----------------------------------------------------
        % First valid cycle establishes feature structure
        % ----------------------------------------------------

        if isempty(X)

            featureNames = names;

            X = vector;

        else

            X = [X;vector];

        end

        % ----------------------------------------------------
        % Label
        % ----------------------------------------------------

        currentLabel = cycles(cycleIndex).Label;

        Y(end+1,1) = currentLabel;

        % ----------------------------------------------------
        % Metadata
        % ----------------------------------------------------

        newRow = table( ...
            dataset.PatientID(fileIndex), ...
            string(filename), ...
            cycleIndex, ...
            cycles(cycleIndex).StartTime, ...
            cycles(cycleIndex).EndTime, ...
            currentLabel, ...
            'VariableNames',{ ...
            'PatientID', ...
            'FileName', ...
            'CycleNumber', ...
            'StartTime', ...
            'EndTime', ...
            'Label'});

        metadata = [metadata;newRow];

        validCycles = validCycles + 1;

    end

    % --------------------------------------------------------
    % Progress
    % --------------------------------------------------------

    if mod(fileIndex,25) == 0 || ...
            fileIndex == height(dataset)

        fprintf( ...
            'Processed %d / %d recordings | Valid cycles: %d\n', ...
            fileIndex, ...
            height(dataset), ...
            validCycles);

    end

end

% ------------------------------------------------------------
% Final validation
% ------------------------------------------------------------

if isempty(X)

    error('No valid feature vectors were extracted.');

end

fprintf('\n============================================\n');
fprintf('FEATURE EXTRACTION COMPLETE\n');
fprintf('============================================\n');

fprintf('Total annotated cycles : %d\n',totalCycles);

fprintf('Valid feature cycles   : %d\n',validCycles);

fprintf('Number of features     : %d\n',size(X,2));

fprintf('Number of samples      : %d\n',size(X,1));

fprintf('\nClass distribution:\n');

disp(countcats(Y));

end