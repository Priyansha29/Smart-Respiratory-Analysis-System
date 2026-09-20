function [y,details] = waveletDenoise(x,Fs)

%% WAVELET-BASED RESPIRATORY SOUND DENOISING

    x = x(:);

    x = x - mean(x);

    x = x ./ (max(abs(x)) + eps);

    waveletName = 'sym8';

    decompositionLevel = 6;

    %% Wavelet decomposition

    [C,L] = wavedec( ...
        x, ...
        decompositionLevel, ...
        waveletName);

    %% Estimate noise from finest detail

    finestDetail = detcoef( ...
        C,L,1);

    sigma = median(abs(finestDetail)) / 0.6745;

    threshold = sigma * ...
        sqrt(2*log(length(x)));

    %% Threshold detail coefficients

    Cden = C;

    % MATLAB's coefficient bookkeeping:
    %
    % C = [cA6 cD6 cD5 cD4 cD3 cD2 cD1]

    position = L(1);

    for level = decompositionLevel:-1:1

        detailLength = L(decompositionLevel-level+2);

        detailStart = position + 1;

        detailEnd = position + detailLength;

        d = C(detailStart:detailEnd);

        d = wthresh(d,'s',threshold);

        Cden(detailStart:detailEnd) = d;

        position = detailEnd;

    end

    %% Reconstruct

    y = waverec( ...
        Cden, ...
        L, ...
        waveletName);

    y = y(1:min(length(y),length(x)));

    y = y ./ (max(abs(y)) + eps);

    %% Information

    details.Wavelet = waveletName;

    details.Level = decompositionLevel;

    details.NoiseSigma = sigma;

    details.Threshold = threshold;

    %% Plot

    t = (0:length(y)-1)/Fs;

    figure('Name','Wavelet Denoising');

    subplot(2,1,1);

    plot((0:length(x)-1)/Fs,x);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('Original Signal');

    grid on;

    subplot(2,1,2);

    plot(t,y);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('Wavelet Denoised Signal');

    grid on;

end