function results = controlledNoiseExperiment(x, Fs)

%% CONTROLLED NOISE + DENOISING EXPERIMENT
%
% Purpose:
% Create a known noisy version of the respiratory signal.
% Since the original signal is treated as the reference,
% we can objectively measure denoising performance.
%
% Noise types:
% 1. White Gaussian noise
% 2. Low-frequency baseline disturbance
% 3. 50 Hz electrical interference
% 4. Combined noise
%
% Methods:
% 1. Butterworth IIR
% 2. FIR
% 3. Wavelet denoising

    %% -----------------------------------------------------
    % 1. PREPARE ORIGINAL SIGNAL
    % ------------------------------------------------------

    x = x(:);

    x = x - mean(x);

    x = x ./ (max(abs(x)) + eps);

    N = length(x);

    t = (0:N-1)'/Fs;

    %% -----------------------------------------------------
    % 2. GENERATE CONTROLLED NOISE
    % ------------------------------------------------------

    rng(42);

    %% White Gaussian noise

    desiredSNR = 5;

    signalPower = mean(x.^2);

    noisePower = signalPower / ...
        (10^(desiredSNR/10));

    whiteNoise = sqrt(noisePower) * randn(size(x));

    %% Low-frequency baseline disturbance

    baselineAmplitude = 0.10 * max(abs(x));

    baselineNoise = baselineAmplitude * ...
        sin(2*pi*0.5*t);

    %% 50 Hz electrical interference

    electricalAmplitude = 0.05 * max(abs(x));

    electricalNoise = electricalAmplitude * ...
        sin(2*pi*50*t);

    %% Combined noise

    combinedNoise = ...
        whiteNoise + ...
        baselineNoise + ...
        electricalNoise;

    noisySignal = x + combinedNoise;

    %% Normalize

    noisySignal = noisySignal ./ ...
        (max(abs(noisySignal)) + eps);

    %% -----------------------------------------------------
    % 3. APPLY IIR FILTER
    % ------------------------------------------------------

    lowCutoff = 100;

    highCutoff = min(2500,0.45*Fs);

    [bIIR,aIIR] = butter( ...
        4, ...
        [lowCutoff highCutoff]/(Fs/2), ...
        'bandpass');

    iirSignal = filtfilt( ...
        bIIR,aIIR,noisySignal);

    iirSignal = iirSignal ./ ...
        (max(abs(iirSignal)) + eps);

    %% -----------------------------------------------------
    % 4. APPLY FIR FILTER
    % ------------------------------------------------------

    firOrder = 100;

    bFIR = fir1( ...
        firOrder, ...
        [lowCutoff highCutoff]/(Fs/2), ...
        'bandpass', ...
        hamming(firOrder+1));

    firSignal = filtfilt( ...
        bFIR,1,noisySignal);

    firSignal = firSignal ./ ...
        (max(abs(firSignal)) + eps);

    %% -----------------------------------------------------
    % 5. WAVELET DENOISING
    % ------------------------------------------------------

    [waveletSignal,~] = waveletDenoise( ...
        noisySignal,Fs);

    %% -----------------------------------------------------
    % 6. CALCULATE TRUE PERFORMANCE
    % ------------------------------------------------------
    %
    % Here x is known clean/reference signal.
    %

    metricsNoisy = calculateMetrics(x,noisySignal);

    metricsIIR = calculateMetrics(x,iirSignal);

    metricsFIR = calculateMetrics(x,firSignal);

    metricsWavelet = calculateMetrics( ...
        x,waveletSignal);

    %% -----------------------------------------------------
    % 7. STORE RESULTS
    % ------------------------------------------------------

    results.Reference = x;

    results.Noisy = noisySignal;

    results.IIR = iirSignal;

    results.FIR = firSignal;

    results.Wavelet = waveletSignal;

    results.NoisyMetrics = metricsNoisy;

    results.IIRMetrics = metricsIIR;

    results.FIRMetrics = metricsFIR;

    results.WaveletMetrics = metricsWavelet;

    %% -----------------------------------------------------
    % 8. DISPLAY SIGNALS
    % ------------------------------------------------------

    figure('Name','Controlled Noise Experiment');

    subplot(4,1,1);

    plot(t,x);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('Reference Respiratory Signal');

    grid on;

    subplot(4,1,2);

    plot(t,noisySignal);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('Signal with Controlled Noise');

    grid on;

    subplot(4,1,3);

    plot(t,iirSignal);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('IIR Denoising');

    grid on;

    subplot(4,1,4);

    plot(t,waveletSignal);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('Wavelet Denoising');

    grid on;

    %% -----------------------------------------------------
    % 9. DISPLAY COMPARISON
    % ------------------------------------------------------

    figure('Name','Denoising Comparison');

    plot(t,x);

    hold on;

    plot(t,noisySignal);

    plot(t,iirSignal);

    plot(t,firSignal);

    plot(t,waveletSignal);

    xlabel('Time (s)');

    ylabel('Amplitude');

    title('Reference vs Denoising Methods');

    legend( ...
        'Reference', ...
        'Noisy', ...
        'IIR', ...
        'FIR', ...
        'Wavelet');

    grid on;

    %% -----------------------------------------------------
    % 10. DISPLAY METRICS
    % ------------------------------------------------------

    Method = [ ...
        "Noisy";
        "IIR Butterworth";
        "FIR";
        "Wavelet"];

    MSE = [ ...
        metricsNoisy.MSE;
        metricsIIR.MSE;
        metricsFIR.MSE;
        metricsWavelet.MSE];

    RMSE = [ ...
        metricsNoisy.RMSE;
        metricsIIR.RMSE;
        metricsFIR.RMSE;
        metricsWavelet.RMSE];

    SNR = [ ...
        metricsNoisy.SNR_dB;
        metricsIIR.SNR_dB;
        metricsFIR.SNR_dB;
        metricsWavelet.SNR_dB];

    Correlation = [ ...
        metricsNoisy.Correlation;
        metricsIIR.Correlation;
        metricsFIR.Correlation;
        metricsWavelet.Correlation];

    results.Table = table( ...
        Method, ...
        MSE, ...
        RMSE, ...
        SNR, ...
        Correlation);

    fprintf('\n');
    fprintf('=============================================\n');
    fprintf('CONTROLLED DENOISING EXPERIMENT\n');
    fprintf('=============================================\n');

    disp(results.Table);

end


%% =========================================================
% LOCAL METRIC FUNCTION
% ==========================================================

function metrics = calculateMetrics(reference,processed)

    reference = reference(:);
    processed = processed(:);

    N = min(length(reference), ...
            length(processed));

    reference = reference(1:N);
    processed = processed(1:N);

    errorSignal = reference - processed;

    mse = mean(errorSignal.^2);

    rmse = sqrt(mse);

    signalPower = mean(reference.^2);

    noisePower = mean(errorSignal.^2);

    snrValue = 10*log10( ...
        (signalPower+eps)/ ...
        (noisePower+eps));

    R = corrcoef(reference,processed);

    if size(R,1) >= 2

        correlation = R(1,2);

    else

        correlation = NaN;

    end

    metrics.MSE = mse;

    metrics.RMSE = rmse;

    metrics.SNR_dB = snrValue;

    metrics.Correlation = correlation;

end