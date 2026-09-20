function dataset = loadICBHI(dataFolder)

% LOADICBHI
% Loads all ICBHI WAV recordings and extracts patient information.

    % Find all WAV files
    wavFiles = dir(fullfile(dataFolder, '*.wav'));

    nFiles = length(wavFiles);

    if nFiles == 0
        error('No WAV files found in: %s', dataFolder);
    end

    % Preallocate
    FileName = strings(nFiles,1);
    PatientID = zeros(nFiles,1);
    RecordingID = strings(nFiles,1);

    % Process every recording
    for i = 1:nFiles

        filename = wavFiles(i).name;

        FileName(i) = string(filename);

        % Extract patient ID
        %
        % Example filename:
        % 101_1b1_Al_sc_Meditron.wav
        %
        % Patient ID = 101

        parts = split(filename, '_');

        PatientID(i) = str2double(parts{1});

        % Store recording identifier
        RecordingID(i) = join(parts(1:end-1), '_');

    end

    % Create table
    dataset = table( ...
        FileName, ...
        PatientID, ...
        RecordingID);

end