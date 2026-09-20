function results = compareFilters(x, Fs)

%% FIR vs IIR FILTER COMPARISON
%
% Compares:
% 1. Butterworth IIR
% 2. FIR Window-based filter
%
% Outputs:
% filtered signals and filter characteristics.

    %% Basic preprocessing

    x = x - mean(x);

    % Normalize input
    x = x ./ (max(abs(x)) + eps);

    %% Filter specifications

    lowCutoff = 100;
    highCutoff = min(2500, 0.45 * Fs);

    %% =====================================================
    % IIR BUTTERWORTH FILTER
    % ======================================================

    iirOrder = 4;

    [bIIR, aIIR] = butter( ...
        iirOrder, ...
        [lowCutoff highCutoff] / (Fs/2), ...
        'bandpass');

    % Zero-phase filtering
    yIIR = filtfilt(bIIR, aIIR, x);

    %% =====================================================
    % FIR FILTER
    % ======================================================

    firOrder = 100;

    bFIR = fir1( ...
        firOrder, ...
        [lowCutoff highCutoff] / (Fs/2), ...
        'bandpass', ...
        hamming(firOrder + 1));

    aFIR = 1;

    % Zero-phase filtering
    yFIR = filtfilt(bFIR, aFIR, x);

    %% Normalize outputs

    yIIR = yIIR ./ (max(abs(yIIR)) + eps);
    yFIR = yFIR ./ (max(abs(yFIR)) + eps);

    %% =====================================================
    % FREQUENCY RESPONSE
    % ======================================================

    [HIIR, fIIR] = freqz(bIIR, aIIR, 4096, Fs);

    [HFIR, fFIR] = freqz(bFIR, aFIR, 4096, Fs);

    %% =====================================================
    % STORE RESULTS
    % ======================================================

    results.Original = x;

    results.IIR = yIIR;

    results.FIR = yFIR;

    results.bIIR = bIIR;

    results.aIIR = aIIR;

    results.bFIR = bFIR;

    results.aFIR = aFIR;

    results.fIIR = fIIR;

    results.HIIR = HIIR;

    results.fFIR = fFIR;

    results.HFIR = HFIR;

    %% =====================================================
    % PLOTS
    % ======================================================

    t = (0:length(x)-1)/Fs;

    figure('Name','FIR vs IIR Filtering');

    subplot(3,1,1);

    plot(t,x);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('Original Lung Sound');

    grid on;

    subplot(3,1,2);

    plot(t,yIIR);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('Butterworth IIR Filtered Signal');

    grid on;

    subplot(3,1,3);

    plot(t,yFIR);

    xlabel('Time (s)');
    ylabel('Amplitude');

    title('FIR Filtered Signal');

    grid on;

    %% Frequency response

    figure('Name','Filter Frequency Response');

    plot(fIIR,20*log10(abs(HIIR)+eps));

    hold on;

    plot(fFIR,20*log10(abs(HFIR)+eps));

    xlabel('Frequency (Hz)');
    ylabel('Magnitude (dB)');

    title('FIR vs IIR Frequency Response');

    legend('Butterworth IIR','FIR');

    xlim([0 min(4000,Fs/2)]);

    grid on;

end