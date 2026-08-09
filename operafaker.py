import sys
import os

# Ensure the script is running on Windows
if os.name != 'nt':
    print("Error: Windows registry operations are only supported on Windows OS.")
    sys.exit(1)

import winreg

# Target registry configurations to block Opera installation
REG_KEYS = [
    {
        "hive": winreg.HKEY_CURRENT_USER,
        "path": r"SOFTWARE\Opera Software",
        "values": {
            "Last Stable Install Path": (winreg.REG_SZ, r"C:\Program Files\Opera"),
            "Last GX Install Path": (winreg.REG_SZ, r"C:\Program Files\Opera GX"),
        }
    },
    {
        "hive": winreg.HKEY_CURRENT_USER,
        "path": r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\opera.exe",
        "values": {
            "": (winreg.REG_SZ, r"C:\Program Files\Opera\opera.exe"),
            "Path": (winreg.REG_SZ, r"C:\Program Files\Opera"),
        }
    },
    {
        "hive": winreg.HKEY_CURRENT_USER,
        "path": r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Opera 999.0.0.0",
        "values": {
            "DisplayName": (winreg.REG_SZ, "Opera Stable 999.0.0.0"),
            "DisplayVersion": (winreg.REG_SZ, "999.0.0.0"),
            "InstallLocation": (winreg.REG_SZ, r"C:\Program Files\Opera"),
            "UninstallString": (winreg.REG_SZ, "cmd.exe /c echo Immunized"),
            "Publisher": (winreg.REG_SZ, "Opera Software"),
        }
    }
]

def apply_immunization():
    """Creates dummy registry keys to fool the Opera installer."""
    print("[*] Applying Opera installer block...")
    for entry in REG_KEYS:
        try:
            key = winreg.CreateKeyEx(
                entry["hive"], 
                entry["path"], 
                0, 
                winreg.KEY_WRITE
            )
            for value_name, (val_type, val_data) in entry["values"].items():
                winreg.SetValueEx(key, value_name, 0, val_type, val_data)
            winreg.CloseKey(key)
            print(f" [+] Configured: HKCU\\{entry['path']}")
        except Exception as e:
            print(f" [-] Failed to set HKCU\\{entry['path']}: {e}")
    print("\n[+] Immunization complete. Opera installer should now detect Opera as installed.")

def remove_immunization():
    """Removes the dummy registry keys if you ever want to allow Opera to install."""
    print("[*] Removing Opera installer block...")
    for entry in REG_KEYS:
        try:
            winreg.DeleteKey(entry["hive"], entry["path"])
            print(f" [+] Deleted: HKCU\\{entry['path']}")
        except FileNotFoundError:
            print(f" [!] Key not found (already clean): HKCU\\{entry['path']}")
        except Exception as e:
            print(f" [-] Failed to delete HKCU\\{entry['path']}: {e}")
    print("\n[+] Cleanup complete.")

if __name__ == "__main__":
    print("--- Opera Installer Block Utility ---")
    print("1. Apply Block (Immunize)")
    print("2. Remove Block")
    choice = input("Select an option (1/2): ").strip()
    
    if choice == "1":
        apply_immunization()
    elif choice == "2":
        remove_immunization()
    else:
        print("Invalid choice. Exiting.")
