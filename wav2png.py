import os
import argparse
import numpy as np
import matplotlib
matplotlib.use("Agg")  # 服务器/无显示环境也能保存图
import matplotlib.pyplot as plt
from scipy.io import wavfile
from scipy import signal
from scipy.signal import resample_poly
import librosa

def wav_to_spectrogram_png(wav_path, png_path, top_db=80, max_khz=16.0, target_sr=24000):
    # 使用 librosa 加载并统一采样
    x, sr = librosa.load(wav_path, sr=target_sr, mono=True)

    if len(x) == 0:
        return

    # STFT 参数（25ms 窗/10ms 步）
    nperseg = max(256, int(0.025 * sr))
    noverlap = int(0.015 * sr)

    f, t, Zxx = signal.stft(x, fs=sr, window='hann',
                            nperseg=nperseg, noverlap=noverlap, padded=False, boundary=None)
    Sxx = (np.abs(Zxx) ** 2).astype(np.float32)

    # 转 dB，避免 log(0)
    Sxx_db = 10.0 * np.log10(Sxx + 1e-12)

    # 动态范围裁剪：将色轴固定在 [vmax- top_db, vmax]
    vmax = np.percentile(Sxx_db[np.isfinite(Sxx_db)], 99.0)
    vmin = vmax - float(top_db)

    # 频率上限
    f_max_khz = max(max_khz, (sr / 2.0) / 1000.0)

    # 绘图（imshow 更稳定）
    plt.figure(figsize=(5.0, 6.46))
    extent = [t[0] if len(t) else 0.0, t[-1] if len(t) else len(x)/sr,
              f[0] / 1000.0, (f[-1] / 1000.0)]
    plt.imshow(Sxx_db, origin='lower', aspect='auto', extent=extent,
               cmap='inferno', vmin=vmin, vmax=vmax)
    plt.xlabel('Time [sec]')
    plt.ylabel('Frequency [kHz]')
    plt.ylim(0, f_max_khz)
    # plt.colorbar(label='Power [dB]')
    plt.tight_layout()
    plt.savefig(png_path, dpi=75, bbox_inches='tight')
    plt.close()

def main(in_dir, out_dir, top_db=80, max_khz=16.0):
    os.makedirs(out_dir, exist_ok=True)
    for fn in os.listdir(in_dir):
        # if 'F05_440C020C_CAF.CH1' in fn or 'internal_exp3' in fn:
        #     continue
        if fn.lower().endswith(".wav"):
            wav_path = os.path.join(in_dir, fn)
            png_name = os.path.splitext(fn)[0] + ".png"
            png_path = os.path.join(out_dir, png_name)
            if os.path.exists(png_path):
                continue
            try:
                wav_to_spectrogram_png(wav_path, png_path, top_db=top_db, max_khz=max_khz)
                print("✅", png_path)
            except Exception as e:
                print("❌ 处理失败:", wav_path, "->", e)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--in_dir", required=True, help="包含 .wav 的文件夹")
    parser.add_argument("--out_dir", default="spectrogram_png", help="输出图片文件夹")
    parser.add_argument("--top_db", type=float, default=80.0, help="显示的动态范围（dB）")
    parser.add_argument("--max_khz", type=float, default=12.0, help="频率上限（kHz）")
    args = parser.parse_args()
    main(args.in_dir, args.out_dir, top_db=args.top_db, max_khz=args.max_khz)