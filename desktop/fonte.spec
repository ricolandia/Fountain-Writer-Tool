# -*- mode: python ; coding: utf-8 -*-
"""Fonte — PyInstaller spec (desktop/webapp.py + web/ completo).

Build (one-folder, recomendado para PySide6/QtWebEngine):
    pyinstaller desktop/fonte.spec --distpath dist --workpath build

Resultado: dist/Fonte/ (Linux: Fonte, Windows: Fonte.exe, macOS: Fonte.app)
"""
import os
import sys

ROOT = os.path.abspath(os.path.join(SPECPATH, '..'))
WEB_DIR = os.path.join(ROOT, 'web')
ICON_PATH = os.path.join(SPECPATH, 'icons', 'icon.ico')

block_cipher = None

a = Analysis(
    [os.path.join(SPECPATH, 'webapp.py')],
    pathex=[SPECPATH],
    binaries=[],
    # Inclui a pasta web/ inteira dentro do bundle (_MEIPASS/web)
    datas=[(WEB_DIR, 'web')],
    hiddenimports=[
        'PySide6.QtWebEngineWidgets',
        'PySide6.QtWebEngineCore',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Reduz o tamanho removendo módulos Qt não usados
        'PySide6.QtQml',
        'PySide6.QtQuick',
        'PySide6.QtQuickWidgets',
        'PySide6.QtMultimedia',
        'PySide6.QtMultimediaWidgets',
        'PySide6.Qt3DCore',
        'PySide6.Qt3DRender',
        'PySide6.QtCharts',
        'PySide6.QtDataVisualization',
        'PySide6.QtPdf',
        'PySide6.QtPdfWidgets',
        'PySide6.QtBluetooth',
        'PySide6.QtNfc',
        'PySide6.QtPositioning',
        'PySide6.QtSensors',
        'PySide6.QtSerialPort',
        'PySide6.QtSql',
        'PySide6.QtTest',
        'PySide6.QtXml',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Fonte',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=ICON_PATH if sys.platform == 'win32' else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='Fonte',
)
