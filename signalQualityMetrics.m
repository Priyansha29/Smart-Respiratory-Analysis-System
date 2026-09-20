function metrics = signalQualityMetrics(original, processed)

%% SIGNAL QUALITY METRICS
%
% Calculates:
% 1. MSE
% 2. RMSE
% 3. SNR
% 4. Correlation
%
% NOTE:
% For real clinical recordings, a perfectly clean reference signal
% is generally unavailable. Therefore, these metrics should be
% interpreted carefully.

    %% Make equal length

    N = min(length(original),length(processed));

    original = original(1:N);
    processed = processed(1:N);

    %% Remove DC

    original = original - mean(original);

    processed = processed - mean(processed);

    %% =====================================================
    % ERROR
    % ======================================================

    errorSignal = original - processed;

    %% MSE

    MSE = mean(errorSignal.^2);

    %% RMSE

    RMSE = sqrt(MSE);

    %% =====================================================
    % SNR
    % ======================================================

    signalPower = mean(processed.^2);

    noisePower = mean(errorSignal.^2);

    SNR = 10*log10( ...
        (signalPower + eps) / ...
        (noisePower + eps));

    %% =====================================================
    % CORRELATION
    % ======================================================

    correlationMatrix = corrcoef(original,processed);

    if numel(correlationMatrix) >= 4

        correlation = correlationMatrix(1,2);

    else

        correlation = NaN;

    end

    %% =====================================================
    % STORE
    % ======================================================

    metrics.MSE = MSE;

    metrics.RMSE = RMSE;

    metrics.SNR_dB = SNR;

    metrics.Correlation = correlation;

    %% DISPLAY

    fprintf('\n====================================\n');
    fprintf('SIGNAL QUALITY METRICS\n');
    fprintf('====================================\n');

    fprintf('MSE         : %.6f\n',MSE);

    fprintf('RMSE        : %.6f\n',RMSE);

    fprintf('SNR         : %.2f dB\n',SNR);

    fprintf('Correlation : %.4f\n',correlation);

end