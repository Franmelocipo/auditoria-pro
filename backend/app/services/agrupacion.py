"""
Servicio de agrupación de registros contables por razón social.
Migrado de mayores.js - lógica de extracción y agrupación.
"""
import re
import unicodedata
from typing import Optional
from difflib import SequenceMatcher


# Palabras comunes que NO son razones sociales
PALABRAS_COMUNES = {
    'COMPRA', 'VENTA', 'COBRO', 'PAGO', 'COBRANZA',
    'ORDEN DE PAGO', 'ORDEN PAGO', 'OP',
    'FACTURA', 'FACT', 'FC', 'FA', 'FB', 'FE',
    'NOTA DE CREDITO', 'NOTA CREDITO', 'NC',
    'NOTA DE DEBITO', 'NOTA DEBITO', 'ND',
    'RECIBO', 'REC', 'CHEQUE', 'CH',
    'TRANSFERENCIA', 'TRANSF', 'TRF',
    'DEPOSITO', 'DEPÓSITO', 'DEP',
    'RETENCION', 'RETENCIÓN', 'RET',
    'CANCELACION', 'CANCELACIÓN',
    'APLICACION', 'APLICACIÓN',
    'CONTADO', 'CREDITO', 'CRÉDITO',
    'COMP', 'SEGUN', 'SEGÚN', 'S/COMPROBANTE',
    'AJUSTE', 'DIFERENCIA', 'REDONDEO',
    'DEVOLUCION', 'DEVOLUCIÓN', 'DEV',
    'ANTICIPO', 'ANT', 'A CUENTA',
    'PERCEPCION', 'PERCEPCIÓN', 'PERC',
    'DEBITO', 'DÉBITO', 'ACREDITACION', 'ACREDITACIÓN'
}

# Sufijos empresariales
SUFIJOS_EMPRESARIALES = {
    'SA', 'SRL', 'SAS', 'SACIF', 'SACI', 'SACIFIA', 'SACIFI', 'SAIC',
    'LTDA', 'CIA', 'HNOS', 'HERMANOS', 'HIJOS', 'EHIJOS', 'EHIJO',
    'SOCIEDAD', 'ANONIMA', 'LIMITADA', 'ARGENTINA', 'ARG'
}

# Palabras genéricas que no cuentan como coincidencia
PALABRAS_GENERICAS = {
    'COMERCIAL', 'COMERCIO', 'DISTRIBUIDORA', 'DISTRIBUIDOR',
    'SERVICIOS', 'SERVICIO', 'EMPRESA', 'EMPRESAS', 'CIA',
    'NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO', 'CENTRAL',
    'ARGENTINA', 'ARG', 'NACIONAL', 'INTERNACIONAL',
    'DEL', 'DE', 'LA', 'LOS', 'LAS', 'EL', 'Y', 'E'
}

# Patrones de prefijo a eliminar
PATRONES_PREFIJO = [
    r'^(?:COMPRA|VENTA|COBRO|PAGO)\s+(?:SEGUN|SEGÚN|S/)\s*(?:COMPROBANTE|COMPROB|COMP|FACTURA|FACT|FC|RECIBO|REC)\s*[-–—/]?\s*',
    r'^(?:ORDEN\s*(?:DE\s*)?PAGO)\s*(?:N[°º]?)?\s*[\d\-./]*\s*[-–—/]?\s*',
    r'^OP\s*N[°º]?\s*[\d\-./]+\s*[-–—/]?\s*',
    r'^(?:FACTURA|FACT|FC|FA|FB|FE|NC|ND)\s*[A-Z]?\s*[\d\-./]+\s*[-–—/]?\s*',
    r'^(?:RECIBO|REC|CHEQUE|CH)\s*N[°º]?\s*[\d\-./]+\s*[-–—/]?\s*',
    r'^(?:COMPRA|VENTA|COBRO|PAGO|COMP)\s+(?:CONTADO|CREDITO|CRÉDITO)?\s*[-–—/]?\s*',
    r'^(?:CANCELACION|CANCELACIÓN|APLICACION|APLICACIÓN)\s*(?:DE)?\s*[-–—/]?\s*',
    r'^[A-Z]{1,2}[\d\-./]{6,}\s*[-–—/]?\s*',
    r'^[\d\-./]{4,}\s*[-–—/]?\s*'
]


def quitar_acentos(texto: str) -> str:
    """Elimina acentos de un texto."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )


def es_palabra_comun(texto: str) -> bool:
    """Verifica si un texto es una palabra común (no razón social)."""
    if not texto:
        return True

    txt_upper = texto.upper().strip()

    # Coincidencia exacta
    if txt_upper in PALABRAS_COMUNES:
        return True

    # Solo números/códigos
    if re.match(r'^[\d\-./\s]+$', txt_upper):
        return True

    # Muy corto (menos de 3 caracteres significativos)
    letras = re.sub(r'[^A-Z]', '', txt_upper)
    if len(letras) < 3:
        return True

    # Patrones de códigos de factura/comprobante
    if re.match(r'^[A-Z]?\s*[\d]{4,}[\-\d]*$', txt_upper):
        return True

    # Empieza con palabras comunes
    if re.match(r'^(?:COMPRA|VENTA|COBRO|PAGO|OP|ORDEN|FACTURA|FACT|FC|NC|ND|REC)\b', txt_upper, re.IGNORECASE):
        return True

    return False


def parece_razon_social(texto: str) -> bool:
    """Verifica si un texto parece una razón social válida."""
    if not texto or len(texto) < 3:
        return False

    txt_upper = texto.upper().strip()

    # Tiene al menos 2 letras consecutivas
    if not re.search(r'[A-Z]{2,}', txt_upper):
        return False

    # No es una palabra común
    if es_palabra_comun(txt_upper):
        return False

    # No es solo un código
    if re.match(r'^[A-Z]{1,2}[\d\-.]+$', txt_upper):
        return False

    return True


def normalizar_razon_social(razon_social: str) -> str:
    """Normaliza una razón social para agrupar variantes similares."""
    if not razon_social:
        return 'Sin Asignar'

    normalizada = razon_social.upper().strip()

    # Quitar acentos
    normalizada = quitar_acentos(normalizada)

    # Quitar puntuación al final
    normalizada = re.sub(r'[.,;:]+$', '', normalizada)

    # Quitar espacios múltiples
    normalizada = re.sub(r'\s+', ' ', normalizada).strip()

    # Manejar paréntesis abiertos
    abiertos = normalizada.count('(')
    cerrados = normalizada.count(')')

    if abiertos > cerrados:
        ultimo_parentesis = normalizada.rfind('(')
        if ultimo_parentesis > 0:
            contenido = normalizada[ultimo_parentesis + 1:]
            if len(contenido) < 3:
                normalizada = normalizada[:ultimo_parentesis].strip()
            else:
                normalizada += ')'

    return normalizada if normalizada else 'Sin Asignar'


def extraer_razon_social(leyenda: str) -> str:
    """
    Extrae la razón social de una leyenda contable.
    Ignora palabras comunes como COMPRA, VENTA, ORDEN DE PAGO, etc.
    """
    if not leyenda or not isinstance(leyenda, str):
        return 'Sin Asignar'

    texto = leyenda.strip()

    # PASO 0: Extraer razón social de paréntesis al final
    match_parentesis = re.search(r'\(([^)]{3,})\)\s*$', texto)
    if match_parentesis:
        contenido = match_parentesis.group(1).strip()
        if parece_razon_social(contenido):
            return normalizar_razon_social(contenido)

    # PASO 1: Dividir por separadores comunes
    partes = re.split(r'\s*[-–—/|]\s*', texto)
    partes = [p.strip() for p in partes if p.strip()]

    for i, parte in enumerate(partes):
        # Quitar prefijos numéricos
        parte = re.sub(r'^[\d\s]+', '', parte).strip()

        if parece_razon_social(parte):
            nombre_completo = parte

            # Verificar si la siguiente parte es un tipo societario
            if i + 1 < len(partes):
                siguiente = partes[i + 1].strip()
                es_tipo = re.match(
                    r'^(?:S\.?A\.?C\.?I\.?F\.?|S\.?A\.?|S\.?R\.?L\.?|S\.?A\.?S\.?|S\.?C\.?|S\.?H\.?|INC|LLC|LTDA?|CIA)',
                    siguiente, re.IGNORECASE
                )
                if es_tipo or siguiente.startswith('('):
                    nombre_completo = f"{parte} {siguiente}"

            return normalizar_razon_social(nombre_completo)

    # PASO 2: Eliminar prefijos conocidos
    texto_limpio = texto
    for patron in PATRONES_PREFIJO:
        texto_limpio = re.sub(patron, '', texto_limpio, flags=re.IGNORECASE)
    texto_limpio = texto_limpio.strip()

    if len(texto_limpio) >= 3:
        partes_limpias = re.split(r'\s*[-–—/|]\s*', texto_limpio)
        partes_limpias = [p.strip() for p in partes_limpias if p.strip()]

        for parte in partes_limpias:
            parte_clean = re.sub(r'^[\d\s]+', '', parte).strip()
            if parece_razon_social(parte_clean):
                return normalizar_razon_social(parte_clean)

        if parece_razon_social(texto_limpio) and len(texto_limpio) <= 80:
            return normalizar_razon_social(texto_limpio)

    # PASO 3: Buscar patrones específicos
    match = re.search(
        r'(?:^|\s)(?:A|DE|CLIENTE|PROVEEDOR|PROV|CLI|PARA):\s*(.+?)(?:\s*[-–—/]|$)',
        texto, re.IGNORECASE
    )
    if match and parece_razon_social(match.group(1)):
        return normalizar_razon_social(match.group(1).strip())

    # PASO 4: Último recurso
    if len(texto) <= 60 and parece_razon_social(texto):
        return normalizar_razon_social(texto)

    return 'Sin Asignar'


def generar_clave_agrupacion(razon_social: str) -> str:
    """Genera una clave para agrupar variantes del mismo nombre."""
    if not razon_social or razon_social == 'Sin Asignar':
        return razon_social

    clave = razon_social.upper()

    # Quitar puntuación
    clave = re.sub(r'[.,;:\-–—/\\()\'"]', ' ', clave)

    # Quitar sufijos societarios
    clave = re.sub(r'\b(?:SA|SRL|SAS|SACIF|SCA|SH|INC|LLC|LTDA?|CIA)\b', '', clave)

    # Quitar espacios múltiples
    clave = re.sub(r'\s+', ' ', clave).strip()

    # Tomar primeras 4 palabras significativas
    palabras = [p for p in clave.split() if len(p) >= 2]
    clave = ' '.join(palabras[:4])

    return clave if clave else razon_social


def calcular_similitud(str1: str, str2: str) -> float:
    """Calcula similitud entre dos strings (0 a 1)."""
    if not str1 or not str2:
        return 0.0
    if str1 == str2:
        return 1.0

    s1 = str1.upper()
    s2 = str2.upper()

    # Si uno contiene al otro completamente
    if (s2 in s1 and len(s2) >= 5) or (s1 in s2 and len(s1) >= 5):
        return 0.9

    def extraer_palabras_significativas(texto: str):
        todas = [p for p in texto.split() if len(p) >= 2]
        significativas = [
            p for p in todas
            if p not in SUFIJOS_EMPRESARIALES and p not in PALABRAS_GENERICAS
        ]
        return todas, significativas

    todas1, sig1 = extraer_palabras_significativas(s1)
    todas2, sig2 = extraer_palabras_significativas(s2)

    if not sig1 or not sig2:
        return 0.0

    # Determinar si es nombre simple
    es_simple1 = len(sig1) == 1 and len(todas1) <= 3
    es_simple2 = len(sig2) == 1 and len(todas2) <= 3
    ambos_simples = es_simple1 and es_simple2

    # Contar coincidencias
    set1 = set(sig1)
    set2 = set(sig2)
    coincidencias = len(set1 & set2)

    # Mínimo requerido
    minimo = 1 if ambos_simples else 2

    if coincidencias < minimo:
        return 0.0

    total = max(len(set1), len(set2))
    return coincidencias / total


def generar_id_agrupacion(razon_social: str) -> str:
    """Genera un ID único para una agrupación."""
    import time
    base = re.sub(r'[^a-z0-9]', '_', razon_social.lower())[:50]
    return f"agrup_{base}_{int(time.time() * 1000)}"
