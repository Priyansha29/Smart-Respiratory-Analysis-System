function summary = analyzeDenoisingPerformance(results,Fs)

%% AUTOMATIC DENOISING PERFORMANCE ANALYSIS

    %% -----------------------------------------------------
    % EXTRACT METHODS
    % ------------------------------------------------------

    methodNames = { ...
        'Noisy', ...
        'IIR Butterworth', ...
        'FIR', ...
        'Wavelet'};

    signals = { ...
        results.Noisy, ...
        results.IIR, ...
        results.FIR, ...
        results.Wavelet};

    reference = results.Reference;

    %% -----------------------------------------------------
    % PREALLOCATE
    % ------------------------------------------------------

    nMethods = length(signals);

    MSE = zeros(nMethods,1);

    RMSE = zeros(nMethods,1);

    SNR = zeros(nMethods,1);

    Correlation = zeros(nMethods,1);

    %% -----------------------------------------------------
    % CALCULATE METRICS
    % ------------------------------------------------------

    for i = 1:nMethods

        currentSignal = signals{i};

        N = min( ...
            length(reference), ...
            length(currentSignal));

        ref = reference(1:N);

        sig = currentSignal(1:N);

        errorSignal = ref - sig;

        MSE(i) = mean(errorSignal.^2);

        RMSE(i) = sqrt(MSE(i));

        signalPower = mean(ref.^2);

        noisePower = mean(errorSignal.^2);

        SNR(i) = 10*log10( ...
            (signalPower+eps)/ ...
            (noisePower+eps));

        R = corrcoef(ref,sig);

        if size(R,1) >= 2

            Correlation(i) = R(1,2);

        else

            Correlation(i) = NaN;

        end

    end

    %% -----------------------------------------------------
    % CREATE SUMMARY TABLE
    % ------------------------------------------------------

    Method = string(methodNames)';

    summary = table( ...
        Method, ...
        MSE, ...
        RMSE, ...
        SNR, ...
        Correlation);

    fprintf('\n');
    fprintf('=============================================\n');
    fprintf('FINAL DENOISING PERFORMANCE\n');
    fprintf('=============================================\n');

    disp(summary);

    %% -----------------------------------------------------
    % 1. SNR COMPARISON
    % ------------------------------------------------------

    figure('Name','SNR Comparison');

    bar(SNR);

    xticks(1:nMethods);

    xticklabels(methodNames);

    ylabel('SNR (dB)');

    title('Denoising Performance - SNR');

    grid on;

    %% -----------------------------------------------------
    % 2. MSE COMPARISON
    % ------------------------------------------------------

    figure('Name','MSE Comparison');

    bar(MSE);

    xticks(1:nMethods);

    xticklabels(methodNames);

    ylabel('MSE');

    title('Denoising Performance - MSE');

    grid on;

    %% -----------------------------------------------------
    % 3. CORRELATION COMPARISON
    % ------------------------------------------------------

    figure('Name','Correlation Comparison');

    bar(Correlation);

    xticks(1:nMethods);

    xticklabels(methodNames);

    ylabel('Correlation');

    title('Signal Preservation');

    ylim([0 1]);

    grid on;

    %% -----------------------------------------------------
    % 4. TIME-DOMAIN COMPARISON
    % ------------------------------------------------------

    N = min(length(reference), ...
            length(signals{1}));

    t = (0:N-1)/Fs;

    figure('Name','Complete Denoising Comparison');

    plot(t,reference(1:N));

    hold on;

    for i = 1:nMethods

        if i == 1
            continue;
        end

        sig = signals{i};

        sig = sig(1:min(N,length(sig)));

        plot( ...
            t(1:length(sig)), ...
            sig);

    end

    xlabel('Time (s)');

    ylabel('Amplitude');

    title('Reference and Denoised Signals');

    legend( ...
        'Reference', ...
        'IIR', ...
        'FIR', ...
        'Wavelet');

    grid on;

    %% -----------------------------------------------------
    % 5. FREQUENCY DOMAIN COMPARISON
    % ------------------------------------------------------

    figure('Name','Frequency Domain Comparison');

    colors = lines(nMethods);

    for i = 1:nMethods

        sig = signals{i};

        Nsig = length(sig);

        Y = fft(sig);

        P = abs(Y/Nsig);

        P = P(1:floor(Nsig/2)+1);

        P(2:end-1) = 2*P(2:end-1);

        f = Fs*(0:floor(Nsig/2))/Nsig;

        plot(f,P);

        hold on;

    end

    xlabel('Frequency (Hz)');

    ylabel('Magnitude');

    title('Frequency Spectrum Comparison');

    xlim([0 min(3000,Fs/2)]);

    legend(methodNames);

    grid on;

    %% -----------------------------------------------------
    % 6. FIND BEST VALUES
    % ------------------------------------------------------

    % These are only numerical indicators.
    % We do not automatically declare one method
    % clinically "best".

    [~,highestSNRIndex] = max(SNR);

    [~,lowestMSEIndex] = min(MSE);

    [~,highestCorrelationIndex] = ...
        max(Correlation);

    fprintf('\n');
    fprintf('Highest SNR      : %s\n', ...
        methodNames{highestSNRIndex});

    fprintf('Lowest MSE       : %s\n', ...
        methodNames{lowestMSEIndex});

    fprintf('Highest Correlation : %s\n', ...
        methodNames{highestCorrelationIndex});

end