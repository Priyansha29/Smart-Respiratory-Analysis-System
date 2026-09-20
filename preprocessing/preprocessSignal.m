function [y,b,a] = preprocessSignal(x,Fs)

%% RESPIRATORY SOUND PREPROCESSING

% Remove DC component

x = x - mean(x);

%% Band-pass filter

lowCutoff = 100;
highCutoff = min(2500,0.45*Fs);

[b,a] = butter(4, ...
    [lowCutoff highCutoff]/(Fs/2), ...
    'bandpass');

%% Zero-phase filtering

y = filtfilt(b,a,x);

%% Normalize

y = y ./ (max(abs(y)) + eps);

end