# 🫁 Respiratory Sound & Lung Disease Analysis

### DSP and Machine Learning Based Analysis of Respiratory Sounds for Abnormal Breath Sound and Lung Disease Screening

<p align="center">

  <img src="https://img.shields.io/badge/MATLAB-R202x-orange?style=for-the-badge&logo=mathworks" />
  <img src="https://img.shields.io/badge/Signal%20Processing-DSP-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Machine%20Learning-Classification-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Explainable%20AI-Analysis-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge" />

</p>

---

## 📌 Overview

**Respiratory Sound & Lung Disease Analysis** is a signal-processing and machine-learning based system designed to analyze lung and respiratory sounds and identify abnormal acoustic patterns associated with respiratory conditions.

The project combines **Digital Signal Processing (DSP), time-frequency analysis, feature engineering, machine learning, dimensionality reduction, model evaluation, and explainability** into a single end-to-end pipeline.

Instead of treating a lung recording as a simple audio file, the system analyzes its underlying acoustic characteristics — including frequency content, spectral properties, MFCCs, wavelet features, and respiratory-cycle patterns — to identify abnormalities such as:

- Normal respiratory sounds
- Crackles
- Wheezes
- Combined crackle + wheeze patterns

These acoustic abnormalities can be associated with different respiratory and pulmonary conditions. The long-term objective of the project is to build a computational screening and decision-support framework for **lung sound and respiratory disease analysis**.

> ⚠️ **Important:** This project is intended for research, educational, and screening-support purposes. It is **not a clinical diagnostic system** and does not replace professional medical evaluation.

---

# 🎯 Project Objectives

The primary objectives of this project are to:

- Analyze respiratory sounds using DSP techniques.
- Remove unwanted noise while preserving clinically relevant acoustic information.
- Automatically segment recordings into respiratory cycles.
- Extract meaningful time-domain, frequency-domain, time-frequency, wavelet, and MFCC features.
- Classify respiratory cycles into different acoustic categories.
- Compare multiple machine-learning algorithms.
- Analyze model performance using multiple evaluation metrics.
- Investigate which acoustic features contribute most to classification.
- Visualize the underlying respiratory sound feature space using PCA.
- Analyze prediction confidence.
- Aggregate cycle-level predictions to obtain recording/patient-level results.
- Provide a foundation for a future interactive respiratory sound analysis application.
- Explore the possibility of real-time respiratory sound acquisition using MEMS microphones and embedded hardware.

---

# 🧠 System Architecture

```text
                    ┌──────────────────────┐
                    │ Respiratory Sound    │
                    │       Input          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Signal Preprocessing │
                    │                      │
                    │ • Normalization      │
                    │ • Bandpass Filtering │
                    │ • Noise Reduction    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Respiratory Cycle    │
                    │     Segmentation     │
                    └──────────┬───────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │        Feature Extraction      │
              │                                │
              │ • Time-domain features         │
              │ • Frequency-domain features    │
              │ • STFT features                │
              │ • MFCC features                │
              │ • Wavelet features             │
              └───────────────┬────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ Feature Matrix       │
                    │ 101 Features/Cycle   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Machine Learning     │
                    │                      │
                    │ • SVM                │
                    │ • Random Forest      │
                    │ • KNN                │
                    │ • Ensemble           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Model Evaluation     │
                    │                      │
                    │ • Accuracy           │
                    │ • Precision          │
                    │ • Recall             │
                    │ • F1 Score           │
                    │ • Confusion Matrix   │
                    └──────────┬───────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │ Advanced Analysis            │
                │                              │
                │ • PCA                        │
                │ • Feature Importance         │
                │ • Prediction Confidence      │
                │ • Patient-level Aggregation  │
                └──────────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Respiratory / Lung  │
                    │ Sound Analysis       │
                    │ & Screening Support  │
                    └──────────────────────┘


---

## 🫁 Problem Statement

Respiratory sounds contain valuable acoustic information about the functioning of the respiratory system. Abnormal sounds such as **crackles and wheezes** can occur in a range of respiratory and pulmonary conditions.

However, manually analyzing respiratory sounds can be subjective, time-consuming, and difficult to scale.

**PulmoSense** explores whether digital signal processing and machine learning can be used to automatically extract meaningful information from respiratory audio recordings and identify abnormal acoustic patterns.

The system therefore focuses on three levels of analysis:

1. **Signal Level** — How does the respiratory sound behave acoustically?
2. **Cycle Level** — Can individual respiratory cycles be classified based on their acoustic characteristics?
3. **Recording / Patient Level** — Can predictions across multiple respiratory cycles be aggregated into a higher-level respiratory sound analysis?

The ultimate objective is to establish a computational framework that can be extended toward **lung disease screening and respiratory health analysis**, while keeping clinical diagnosis outside the scope of the current prototype.

---

# 🔬 Methodology

The complete pipeline consists of the following stages:

### 1. Data Acquisition

Respiratory recordings are obtained from the ICBHI 2017 Respiratory Sound Database.

Each recording is associated with respiratory-cycle annotations containing:

- Start time
- End time
- Crackle presence
- Wheeze presence

These annotations allow individual respiratory cycles to be isolated and analyzed independently.

---

### 2. Patient-Wise Dataset Splitting

To reduce the risk of data leakage, the dataset is divided at the **patient level** rather than randomly splitting individual respiratory cycles.

```text
Patients
   │
   ├───────────────┐
   ▼               ▼
Training Patients  Testing Patients
   │               │
   ▼               ▼
Training Cycles    Testing Cycles
