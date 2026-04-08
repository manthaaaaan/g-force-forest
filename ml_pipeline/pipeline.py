import os
import json
import time
import requests
import numpy as np
import matplotlib.pyplot as plt
import librosa
import librosa.display
import soundfile as sf

# 1. Configuration
WAV_FILE = "sample_audio.wav"
API_ENDPOINT = "http://localhost:3001/api/simulate-sound"
NODE_ID = 2

def generate_dummy_wav(filepath):
    """Generates a 1-second synthetic 440Hz sine wave if no audio file exists."""
    if not os.path.exists(filepath):
        print(f"[{time.strftime('%H:%M:%S')}] Generating dummy audio file: {filepath}")
        sample_rate = 22050
        duration = 1.0
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        audio = 0.5 * np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
        sf.write(filepath, audio, sample_rate)

def create_mel_spectrogram(audio_path, output_image_path):
    """Loads a .wav file and generates a Mel-spectrogram .png"""
    print(f"[{time.strftime('%H:%M:%S')}] Loading audio file: {audio_path}")
    y, sr = librosa.load(audio_path, sr=None)
    
    print(f"[{time.strftime('%H:%M:%S')}] Generating Mel-spectrogram...")
    S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
    S_dB = librosa.power_to_db(S, ref=np.max)
    
    plt.figure(figsize=(10, 4))
    librosa.display.specshow(S_dB, x_axis='time', y_axis='mel', sr=sr, fmax=8000)
    plt.colorbar(format='%+2.0f dB')
    plt.title('Mel-frequency spectrogram')
    plt.tight_layout()
    plt.savefig(output_image_path)
    plt.close()
    print(f"[{time.strftime('%H:%M:%S')}] Saved Spectrogram image to: {output_image_path}")

def dummy_cnn_prediction(audio_path):
    """Simulates a PyTorch CNN model predicting the class of the audio."""
    print(f"[{time.strftime('%H:%M:%S')}] Passing {audio_path} through Dummy CNN Model...")
    time.sleep(1) # inference time
    prediction = {"classification": "chainsaw", "confidence": 0.96}
    print(f"[{time.strftime('%H:%M:%S')}] Model Prediction: {prediction}")
    return prediction

def send_update_to_backend(prediction, node_id):
    """Posts the classification result to the Express backend."""
    payload = {
        "nodeId": node_id,
        "soundType": prediction["classification"],
        "confidenceScore": prediction["confidence"]
    }
    
    print(f"[{time.strftime('%H:%M:%S')}] Sending POST request to Edge Server (Node ID: {node_id})...")
    try:
        response = requests.post(API_ENDPOINT, json=payload)
        response.raise_for_status()
        print(f"[{time.strftime('%H:%M:%S')}] Success! Server Response:")
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"[{time.strftime('%H:%M:%S')}] Error syncing with server: {e}")

def main():
    print("--- Starting Acoustic Classification Pipeline ---")
    spectrogram_output = "spectrogram_demo.png"
    
    # Optional: Create a dummy wav file if one isn't present
    generate_dummy_wav(WAV_FILE)
    
    # Step 1 & 2: Load wav and output spectrogram
    create_mel_spectrogram(WAV_FILE, spectrogram_output)
    
    # Step 3: Classify 
    prediction = dummy_cnn_prediction(WAV_FILE)
    
    # Step 4: POST to server
    send_update_to_backend(prediction, NODE_ID)
    
    print("--- Pipeline Execution Complete ---")

if __name__ == "__main__":
    main()
