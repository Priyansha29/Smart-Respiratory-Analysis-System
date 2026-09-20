function annotations = readICBHIAnnotation(annotationFile)

%% READ ICBHI RESPIRATORY CYCLE ANNOTATION
%
% ICBHI annotation format:
%
% Start_time
% End_time
% Crackles
% Wheezes

if ~isfile(annotationFile)
    error('Annotation file not found: %s',annotationFile);
end

fid = fopen(annotationFile,'r');

data = textscan(fid,'%f %f %d %d');

fclose(fid);

StartTime = data{1};
EndTime = data{2};

Crackles = data{3};
Wheezes = data{4};

annotations = table( ...
    StartTime, ...
    EndTime, ...
    Crackles, ...
    Wheezes);

%% Create combined respiratory sound label

n = height(annotations);

Label = strings(n,1);

for i = 1:n

    if Crackles(i) == 0 && Wheezes(i) == 0

        Label(i) = "Normal";

    elseif Crackles(i) == 1 && Wheezes(i) == 0

        Label(i) = "Crackle";

    elseif Crackles(i) == 0 && Wheezes(i) == 1

        Label(i) = "Wheeze";

    elseif Crackles(i) == 1 && Wheezes(i) == 1

        Label(i) = "Crackle + Wheeze";

    end

end

annotations.Label = categorical(Label);

end