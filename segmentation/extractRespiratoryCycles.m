function cycles = extractRespiratoryCycles(x,Fs,annotations)

%% EXTRACT RESPIRATORY CYCLES

nCycles = height(annotations);

cycles = struct([]);

validCount = 0;

for i = 1:nCycles

    startSample = floor(annotations.StartTime(i)*Fs) + 1;

    endSample = floor(annotations.EndTime(i)*Fs);

    % Safety checks

    startSample = max(startSample,1);

    endSample = min(endSample,length(x));

    if endSample <= startSample
        continue;
    end

    signal = x(startSample:endSample);

    validCount = validCount + 1;

    cycles(validCount).Signal = signal;

    cycles(validCount).StartTime = ...
        annotations.StartTime(i);

    cycles(validCount).EndTime = ...
        annotations.EndTime(i);

    cycles(validCount).Crackles = ...
        annotations.Crackles(i);

    cycles(validCount).Wheezes = ...
        annotations.Wheezes(i);

    cycles(validCount).Label = ...
        annotations.Label(i);

end

end