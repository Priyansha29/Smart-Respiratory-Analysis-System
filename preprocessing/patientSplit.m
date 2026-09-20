function [trainData,testData] = patientSplit(dataset,trainRatio)

%% PATIENT-INDEPENDENT DATASET SPLIT

rng(42);

patients = unique(dataset.PatientID);

nPatients = length(patients);

nTrain = round(trainRatio*nPatients);

randomOrder = randperm(nPatients);

trainPatients = patients(randomOrder(1:nTrain));

testPatients = patients(randomOrder(nTrain+1:end));

trainMask = ismember(dataset.PatientID,trainPatients);

testMask = ismember(dataset.PatientID,testPatients);

trainData = dataset(trainMask,:);

testData = dataset(testMask,:);

end