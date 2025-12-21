#!/usr/bin/env python3
"""
Módulo de impresión térmica para Raspberry Pi
Envía comandos ESC/POS directamente por socket (sin Flask)
"""

import socket
import os
from PIL import Image
from pathlib import Path
from datetime import datetime

# Rutas a los assets
BASE_DIR = Path(__file__).parent
LOGO_PATH = BASE_DIR / "static" / "logo_thermal.png"
QR_PATH = BASE_DIR / "static" / "qr_thermal2.png"


def image_to_raster(image_path):
    """Convierte imagen a formato GS v 0 (Raster Bit Image)"""
    if not os.path.exists(image_path):
        return b''
    
    try:
        img = Image.open(image_path)
        
        if img.mode != '1':
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[3] if len(img.split()) > 3 else None)
                img = background
            
            img = img.convert('L')
            img = img.convert('1', dither=Image.Dither.FLOYDSTEINBERG)
        
        width, height = img.size
        width_bytes = (width + 7) // 8
        
        cmd = b'\x1d\x76\x30'
        cmd += bytes([0])
        cmd += bytes([width_bytes % 256, width_bytes // 256])
        cmd += bytes([height % 256, height // 256])
        
        for y in range(height):
            for x_byte in range(width_bytes):
                byte_val = 0
                for bit in range(8):
                    x = x_byte * 8 + bit
                    if x < width:
                        pixel = img.getpixel((x, y))
                        if pixel == 0:
                            byte_val |= (1 << (7 - bit))
                cmd += bytes([byte_val])
        
        return cmd
        
    except Exception as e:
        print(f"[WARN] Error procesando imagen: {e}")
        return b''


def print_ticket(ticket_type: str, license_plate: str, check_in_time: str, 
                 amount: float, check_out_time: str = None, spot_type: str = None,
                 printer_host: str = "192.168.1.100", printer_port: int = 9100):
    """
    Imprime ticket térmico directamente por socket
    
    Args:
        ticket_type: 'checkout', 'prepayment', 'extension', 'open_exit'
        license_plate: Matrícula
        check_in_time: Fecha entrada (ISO format)
        amount: Importe total
        check_out_time: Fecha salida (ISO format, opcional)
        spot_type: Tipo de plaza ('A', 'B', 'C', 'Special')
        printer_host: IP de la impresora
        printer_port: Puerto de la impresora
    
    Returns:
        dict: {"success": bool, "message": str}
    """
    
    try:
        # Formatear fechas
        entry_dt = datetime.fromisoformat(check_in_time.replace('Z', '+00:00'))
        entry_formatted = entry_dt.strftime('%d/%m/%Y')
        
        exit_formatted = None
        nights = 0
        if check_out_time:
            exit_dt = datetime.fromisoformat(check_out_time.replace('Z', '+00:00'))
            exit_formatted = exit_dt.strftime('%d/%m/%Y')
            duration = exit_dt - entry_dt
            nights = max(1, int(duration.total_seconds() / (24 * 3600)))
        
        # Comandos ESC/POS
        ESC = b'\x1b'
        GS = b'\x1d'
        
        INIT = ESC + b'@'
        ALIGN_CENTER = ESC + b'a' + b'\x01'
        ALIGN_LEFT = ESC + b'a' + b'\x00'
        NORMAL = ESC + b'!' + b'\x00'
        DOUBLE_HEIGHT = ESC + b'!' + b'\x10'
        DOUBLE_WIDTH = ESC + b'!' + b'\x20'
        DOUBLE_BOTH = ESC + b'!' + b'\x30'
        BOLD_ON = ESC + b'E' + b'\x01'
        BOLD_OFF = ESC + b'E' + b'\x00'
        CUT = GS + b'V' + b'\x00'
        
        # Conectar a impresora
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((printer_host, printer_port))
        
        ticket = b''
        ticket += INIT
        ticket += ALIGN_CENTER
        
        # LOGO
        if LOGO_PATH.exists():
            logo_data = image_to_raster(str(LOGO_PATH))
            if logo_data:
                ticket += logo_data
                ticket += b'\n\n'
        
        # ENCABEZADO
        ticket += DOUBLE_HEIGHT + BOLD_ON
        ticket += b'TICKET DE PARKING\n\n'
        ticket += NORMAL + BOLD_OFF
        ticket += b'--------------------------------\n'
        
        # MATRÍCULA
        ticket += ALIGN_LEFT
        ticket += BOLD_ON + b'MATRICULA:       ' + BOLD_OFF
        ticket += DOUBLE_BOTH
        ticket += license_plate.encode('utf-8') + b'\n'
        ticket += NORMAL
        
        # PLAZA
        if spot_type:
            ticket += BOLD_ON + b'PLAZA:           ' + BOLD_OFF
            ticket += DOUBLE_WIDTH
            ticket += spot_type.encode('utf-8') + b'\n'
            ticket += NORMAL
        
        ticket += b'--------------------------------\n'
        
        # FECHAS
        ticket += BOLD_ON + b'ENTRADA:         ' + BOLD_OFF
        ticket += entry_formatted.encode('utf-8') + b'\n'
        
        if ticket_type == 'open_exit':
            ticket += b'--------------------------------\n\n'
            ticket += ALIGN_CENTER + BOLD_ON
            ticket += b'Por favor, abone su cuenta\n'
            ticket += b'el dia anterior a su salida\n\n'
            ticket += b'Please settle your account\n'
            ticket += b'the day before your departure\n\n'
            ticket += b'Si prefiere hacer transferencia bancaria:\n'
            ticket += b'IBAN: ES62 0182 2104 4902 0167 9208\n\n'
            ticket += BOLD_OFF
        else:
            if ticket_type in ['checkout', 'extension'] and exit_formatted:
                ticket += BOLD_ON + b'SALIDA:          ' + BOLD_OFF
                ticket += exit_formatted.encode('utf-8') + b'\n'
                ticket += BOLD_ON + b'DURACION:        ' + BOLD_OFF
                ticket += f'{nights} noches\n'.encode('utf-8')
            
            ticket += b'--------------------------------\n\n'
        
        # TIPO DE PAGO
        if ticket_type != 'open_exit':
            ticket += ALIGN_LEFT + BOLD_ON + b'TIPO DE PAGO:\n' + BOLD_OFF
            ticket += (b'[X] ' if ticket_type == 'prepayment' else b'[ ] ') + b'Pago adelantado\n'
            ticket += (b'[X] ' if ticket_type == 'checkout' else b'[ ] ') + b'Checkout normal\n'
            ticket += (b'[X] ' if ticket_type == 'extension' else b'[ ] ') + b'Extension de pago\n\n'
        
        # TOTAL
        if ticket_type != 'open_exit':
            ticket += ALIGN_CENTER + b'--------------------------------\n'
            ticket += DOUBLE_BOTH + BOLD_ON
            ticket += b'TOTAL PAGADO\n'
            ticket += f'{amount:.2f} EUR\n'.encode('utf-8')
            ticket += NORMAL + BOLD_OFF
            ticket += b'(IVA incluido)\n'
            ticket += b'================================\n\n'
        else:
            ticket += ALIGN_CENTER + b'================================\n\n'
        
        # PIE
        ticket += b'Gracias por su visita\n'
        
        # QR
        if QR_PATH.exists():
            qr_data = image_to_raster(str(QR_PATH))
            if qr_data:
                ticket += qr_data
                ticket += b'\n'
        
        ticket += b'Escanee para comprobar el horario de autobuses\n\n'
        ticket += b'================================\n\n'
        
        # DATOS EMPRESA
        ticket += BOLD_ON + b'Autocaravana Cordoba SLU\n' + BOLD_OFF
        ticket += b'CIF: B06952931\n'
        ticket += b'C/ Pintora Nuha Al Radi 14\n'
        ticket += b'Bloque 12, 4-1\n'
        ticket += b'14011 Cordoba\n\n'
        ticket += b'================================\n\n\n\n\n'
        
        # Cortar
        ticket += CUT
        
        # Enviar
        sock.sendall(ticket)
        sock.close()
        
        print(f"✓ Ticket {ticket_type} impreso correctamente")
        return {"success": True, "message": "Ticket impreso correctamente"}
        
    except socket.timeout:
        return {"success": False, "message": "Timeout: la impresora no responde"}
    except ConnectionRefusedError:
        return {"success": False, "message": "No se puede conectar a la impresora. Verifica IP y puerto."}
    except Exception as e:
        print(f"✗ Error al imprimir: {e}")
        return {"success": False, "message": f"Error al imprimir: {str(e)}"}