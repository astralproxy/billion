import subprocess
import sys

def main():
    print("Starting Tailwind CSS watch mode via Python...")
    try:
        # Popen runs the process asynchronously so it can stay active
        process = subprocess.Popen(["npm", "run", "watch"], shell=True)
        process.wait()
    except KeyboardInterrupt:
        print("\nStopping Tailwind watch mode.")
        process.terminate()

if __name__ == "__main__":
    main()