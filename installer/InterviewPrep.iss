; Inno Setup Script - Interview Prep App
; Download Inno Setup: https://jrsoftware.org/isdl.php

[Setup]
AppName=Interview Prep App
AppVersion=1.0.0
AppPublisher=CareGo
DefaultDirName={autopf}\InterviewPrepApp
DefaultGroupName=Interview Prep App
OutputDir=dist
OutputBaseFilename=InterviewPrepSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
WizardStyle=modern

[Files]
; Main app files
Source: "interview_prep_assistant_revised.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "installer\install.bat"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "installer\launch.bat"; DestDir: "{app}\installer"; Flags: ignoreversion

[Icons]
Name: "{group}\Interview Prep App"; Filename: "{app}\installer\launch.bat"; WorkingDir: "{app}"
Name: "{commondesktop}\Interview Prep App"; Filename: "{app}\installer\launch.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\installer\install.bat"; Description: "Install dependencies now"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Check if Python is installed
  if not Exec('python', '--version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    MsgBox('Python 3.11 is required. After clicking OK, download and install Python 3.11 from python.org, then re-run this installer.', mbInformation, MB_OK);
    ShellExec('open', 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe', '', '', SW_SHOW, ewNoWait, ResultCode);
  end;
  Result := True;
end;
