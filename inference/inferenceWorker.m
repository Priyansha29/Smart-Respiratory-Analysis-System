function inferenceWorker(jobDir)
%INFERENCEWORKER  Persistent MATLAB inference worker.
%
%   inferenceWorker(jobDir)
%
%   Launched once by the FastAPI backend (via `matlab -batch`). It loads the
%   trained Part 4 models a single time and then serves JSON job files until
%   a stop file appears. This avoids paying MATLAB's startup + 56 MB model
%   load cost on every request.
%
%   File protocol (all inside jobDir):
%     <id>.req.json      request:  {"audioPath":"...","opts":{...}}
%     <id>.res.json      response: {"ok":true,"result":{...}}
%                          or      {"ok":false,"error":"...","identifier":"..."}
%     worker_ready.json  written once after the models are loaded
%     worker_error.json  written if initialisation fails
%     worker_stop        presence asks the worker to exit cleanly
%
%   Request files are deleted after processing so they are handled once.

if nargin < 1 || isempty(jobDir)
    jobDir = fullfile(tempdir, 'pulmosense_jobs');
end
if ~exist(jobDir, 'dir')
    mkdir(jobDir);
end

thisDir = fileparts(mfilename('fullpath'));
root = fileparts(thisDir);
addpath(root, ...
    fullfile(root, 'preprocessing'), fullfile(root, 'segmentation'), ...
    fullfile(root, 'features'), fullfile(root, 'machine_learning'), ...
    fullfile(root, 'analysis'), fullfile(root, 'inference'));
set(0, 'DefaultFigureVisible', 'off');

% clear stale control files from a previous run
cleanIfExists(fullfile(jobDir, 'worker_ready.json'));
cleanIfExists(fullfile(jobDir, 'worker_error.json'));
cleanIfExists(fullfile(jobDir, 'worker_stop'));

try
    ctx = inferenceInit(root);
    writeJsonAtomic(fullfile(jobDir, 'worker_ready.json'), struct( ...
        'ok', true, 'matlabVersion', version, ...
        'startedAt', datestr(now, 30), 'pid', feature('getpid')));
catch ME
    writeJsonAtomic(fullfile(jobDir, 'worker_error.json'), struct( ...
        'ok', false, 'error', ME.message, 'identifier', ME.identifier));
    return;
end

while true
    if isfile(fullfile(jobDir, 'worker_stop'))
        break;
    end

    reqs = dir(fullfile(jobDir, '*.req.json'));
    for i = 1:numel(reqs)
        reqPath = fullfile(reqs(i).folder, reqs(i).name);
        id = regexprep(reqs(i).name, '\.req\.json$', '');
        resPath = fullfile(jobDir, [id '.res.json']);

        try
            req = jsondecode(fileread(reqPath));
            opts = struct();
            if isfield(req, 'opts') && ~isempty(req.opts)
                opts = req.opts;
            end
            result = analyzeRespiratoryRecording(req.audioPath, ctx, opts);
            writeJsonAtomic(resPath, struct('ok', true, 'result', result));
        catch ME
            writeJsonAtomic(resPath, struct('ok', false, ...
                'error', ME.message, 'identifier', ME.identifier));
        end

        delete(reqPath);
    end

    pause(0.2);
end
end

% ------------------------------------------------------------------------
function writeJsonAtomic(path, value)
tmp = [path '.tmp'];
fid = fopen(tmp, 'w', 'n', 'UTF-8');
if fid < 0
    error('inference:workerWrite', 'Cannot write to %s', tmp);
end
fwrite(fid, jsonencode(value), 'char');
fclose(fid);
if isfile(path)
    delete(path);
end
movefile(tmp, path);
end

% ------------------------------------------------------------------------
function cleanIfExists(p)
if isfile(p)
    try
        delete(p);
    catch
    end
end
end
