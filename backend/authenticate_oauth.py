#!/usr/bin/env python3
"""
Script para autenticar con Google Drive usando OAuth
Solo necesitas ejecutarlo UNA VEZ para generar el token
"""

import os
import pickle
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# Scopes necesarios
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def authenticate():
    """Autenticar y guardar token"""
    creds = None
    token_path = '/app/token.pickle'
    credentials_path = '/app/oauth_credentials.json'
    
    # Verificar si ya existe el token
    if os.path.exists(token_path):
        print("✓ Token existente encontrado")
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    # Si no hay credenciales válidas, autenticar
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refrescando token...")
            creds.refresh(Request())
        else:
            print("🔐 Iniciando autenticación OAuth...")
            print("\n" + "="*60)
            print("COPIA Y ABRE ESTA URL EN TU NAVEGADOR:")
            print("="*60)
            
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path, 
                SCOPES,
                redirect_uri='urn:ietf:wg:oauth:2.0:oob'
            )
            
            # Obtener URL de autenticación
            auth_url, _ = flow.authorization_url(prompt='consent')
            
            print(f"\n{auth_url}\n")
            print("="*60)
            print("Después de autorizar, copia el código que aparece")
            print("="*60 + "\n")
            
            # Pedir código manualmente
            code = input("Pega el código aquí: ").strip()
            
            # Intercambiar código por token
            flow.fetch_token(code=code)
            creds = flow.credentials
            
            print("\n✅ Autenticación exitosa!")
        
        # Guardar credenciales para la próxima vez
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
        
        print(f"✓ Token guardado en: {token_path}")
    else:
        print("✓ Token válido encontrado")
    
    return creds

if __name__ == '__main__':
    try:
        authenticate()
        print("\n" + "="*60)
        print("✅ AUTENTICACIÓN COMPLETADA")
        print("="*60)
        print("\nAhora puedes ejecutar los backups normalmente:")
        print("  docker-compose exec backend python3 backup_service.py")
    except Exception as e:
        print(f"\n❌ Error durante la autenticación: {e}")
        import traceback
        traceback.print_exc()