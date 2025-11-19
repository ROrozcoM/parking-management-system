#!/usr/bin/env python3
"""
Script para imprimir tickets en impresora térmica.
Compatible con impresoras ESC/POS (Epson, Star, etc.)

Instalación requerida:
pip install python-escpos pillow

Uso:
python print_ticket.py --type checkout --license ABC1234 --entry "2024-01-15 10:30" --exit "2024-01-15 14:45" --amount 15.50
python print_ticket.py --type prepayment --license ABC1234 --entry "2024-01-15 10:30" --amount 20.00
"""

from escpos.printer import Usb, Network, File
from escpos import printer
from datetime import datetime
import argparse
import sys
import os

class TicketPrinter:
    def __init__(self, printer_type='usb', printer_config=None):
        """
        Inicializa la impresora.
        
        printer_type: 'usb', 'network', 'file' (para testing)
        printer_config: dict con configuración específica del tipo de impresora
        """
        self.printer_config = printer_config or {}
        
        try:
            if printer_type == 'usb':
                # Para USB: necesitas el vendor_id y product_id de tu impresora
                # Puedes encontrarlos con: lsusb en Linux o Device Manager en Windows
                vendor_id = self.printer_config.get('vendor_id', 0x04b8)  # Epson por defecto
                product_id = self.printer_config.get('product_id', 0x0e15)  # TM-T20 por defecto
                self.printer = Usb(vendor_id, product_id)
                
            elif printer_type == 'network':
                # Para impresoras de red
                host = self.printer_config.get('host', '192.168.1.100')
                port = self.printer_config.get('port', 9100)
                self.printer = Network(host, port)
                
            elif printer_type == 'file':
                # Para testing: guarda en archivo
                output_file = self.printer_config.get('output', '/tmp/ticket_output.bin')
                self.printer = File(output_file)
                
            else:
                raise ValueError(f"Tipo de impresora no soportado: {printer_type}")
                
        except Exception as e:
            print(f"Error al conectar con la impresora: {e}")
            print("\nConsejos de solución:")
            print("1. Verifica que la impresora está conectada y encendida")
            print("2. En Linux, ejecuta: lsusb para ver dispositivos USB")
            print("3. Puede que necesites permisos: sudo usermod -a -G lp $USER")
            print("4. Para testing, usa: --printer-type file")
            sys.exit(1)
    
    def print_checkout_ticket(self, license_plate, check_in_time, check_out_time, amount):
        """Imprime ticket de checkout"""
        
        try:
            # Configurar impresora
            self.printer.set(align='center', font='a', bold=True, double_height=True, double_width=True)
            self.printer.text("PARKING TICKET\n")
            self.printer.text("CHECKOUT\n")
            
            # Línea separadora
            self.printer.set(align='center', font='b', bold=False, double_height=False, double_width=False)
            self.printer.text("================================\n")
            
            # Datos del vehículo
            self.printer.set(align='left', font='a', bold=True)
            self.printer.text("\nMATRICULA:\n")
            self.printer.set(bold=False, double_width=True, double_height=True)
            self.printer.text(f"  {license_plate}\n")
            
            # Tiempos
            self.printer.set(double_width=False, double_height=False, bold=True)
            self.printer.text("\nENTRADA:\n")
            self.printer.set(bold=False)
            self.printer.text(f"  {check_in_time}\n")
            
            self.printer.set(bold=True)
            self.printer.text("\nSALIDA:\n")
            self.printer.set(bold=False)
            self.printer.text(f"  {check_out_time}\n")
            
            # Calcular duración
            try:
                entry = datetime.strptime(check_in_time, "%Y-%m-%d %H:%M:%S")
                exit = datetime.strptime(check_out_time, "%Y-%m-%d %H:%M:%S")
                duration = exit - entry
                hours = duration.total_seconds() / 3600
                self.printer.set(bold=True)
                self.printer.text(f"\nDURACION: {hours:.2f} horas\n")
            except:
                pass
            
            # Línea separadora
            self.printer.set(align='center', font='b', bold=False)
            self.printer.text("\n================================\n")
            
            # Importe
            self.printer.set(align='center', font='a', bold=True, double_height=True, double_width=True)
            self.printer.text(f"\nTOTAL: {amount:.2f} EUR\n\n")
            
            # Pie de ticket
            self.printer.set(align='center', font='b', bold=False, double_height=False, double_width=False)
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.printer.text(f"\n{current_time}\n")
            self.printer.text("Gracias por su visita\n")
            self.printer.text("================================\n\n")
            
            # Cortar papel
            self.printer.cut()
            
            print("✓ Ticket de checkout impreso correctamente")
            return True
            
        except Exception as e:
            print(f"Error al imprimir ticket: {e}")
            return False
    
    def print_prepayment_ticket(self, license_plate, check_in_time, amount):
        """Imprime ticket de pago adelantado"""
        
        try:
            # Configurar impresora
            self.printer.set(align='center', font='a', bold=True, double_height=True, double_width=True)
            self.printer.text("PARKING TICKET\n")
            self.printer.text("PAGO ADELANTADO\n")
            
            # Línea separadora
            self.printer.set(align='center', font='b', bold=False, double_height=False, double_width=False)
            self.printer.text("================================\n")
            
            # Datos del vehículo
            self.printer.set(align='left', font='a', bold=True)
            self.printer.text("\nMATRICULA:\n")
            self.printer.set(bold=False, double_width=True, double_height=True)
            self.printer.text(f"  {license_plate}\n")
            
            # Tiempo de entrada
            self.printer.set(double_width=False, double_height=False, bold=True)
            self.printer.text("\nENTRADA:\n")
            self.printer.set(bold=False)
            self.printer.text(f"  {check_in_time}\n")
            
            # Línea separadora
            self.printer.set(align='center', font='b', bold=False)
            self.printer.text("\n================================\n")
            
            # Importe pagado
            self.printer.set(align='center', font='a', bold=True, double_height=True, double_width=True)
            self.printer.text(f"\nPAGADO: {amount:.2f} EUR\n\n")
            
            self.printer.set(align='center', font='b', bold=False, double_height=False, double_width=False)
            self.printer.text("*** PAGADO ***\n")
            
            # Pie de ticket
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.printer.text(f"\n{current_time}\n")
            self.printer.text("Conserve este ticket\n")
            self.printer.text("================================\n\n")
            
            # Cortar papel
            self.printer.cut()
            
            print("✓ Ticket de pago adelantado impreso correctamente")
            return True
            
        except Exception as e:
            print(f"Error al imprimir ticket: {e}")
            return False
    
    def close(self):
        """Cierra la conexión con la impresora"""
        try:
            self.printer.close()
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description='Imprimir tickets de parking')
    
    # Tipo de ticket
    parser.add_argument('--type', required=True, choices=['checkout', 'prepayment'],
                        help='Tipo de ticket: checkout o prepayment')
    
    # Datos del vehículo
    parser.add_argument('--license', required=True, help='Matrícula del vehículo')
    parser.add_argument('--entry', required=True, help='Fecha/hora de entrada (YYYY-MM-DD HH:MM:SS)')
    parser.add_argument('--exit', help='Fecha/hora de salida (solo para checkout)')
    parser.add_argument('--amount', required=True, type=float, help='Importe en euros')
    
    # Configuración de impresora
    parser.add_argument('--printer-type', default='usb', choices=['usb', 'network', 'file'],
                        help='Tipo de impresora')
    parser.add_argument('--vendor-id', help='Vendor ID para impresora USB (hex, ej: 0x04b8)')
    parser.add_argument('--product-id', help='Product ID para impresora USB (hex, ej: 0x0e15)')
    parser.add_argument('--host', help='Host para impresora de red')
    parser.add_argument('--port', type=int, help='Puerto para impresora de red')
    parser.add_argument('--output', help='Archivo de salida para tipo file')
    
    args = parser.parse_args()
    
    # Preparar configuración de impresora
    printer_config = {}
    if args.vendor_id:
        printer_config['vendor_id'] = int(args.vendor_id, 16)
    if args.product_id:
        printer_config['product_id'] = int(args.product_id, 16)
    if args.host:
        printer_config['host'] = args.host
    if args.port:
        printer_config['port'] = args.port
    if args.output:
        printer_config['output'] = args.output
    
    # Crear impresora
    ticket_printer = TicketPrinter(printer_type=args.printer_type, printer_config=printer_config)
    
    # Imprimir según tipo
    try:
        if args.type == 'checkout':
            if not args.exit:
                print("Error: --exit es requerido para tickets de checkout")
                sys.exit(1)
            success = ticket_printer.print_checkout_ticket(
                args.license, args.entry, args.exit, args.amount
            )
        else:  # prepayment
            success = ticket_printer.print_prepayment_ticket(
                args.license, args.entry, args.amount
            )
        
        ticket_printer.close()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\nOperación cancelada por el usuario")
        ticket_printer.close()
        sys.exit(1)


if __name__ == "__main__":
    main()