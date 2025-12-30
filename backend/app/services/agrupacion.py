"""
Servicio de agrupación de registros contables por razón social.
Optimizado para patrones de sistemas contables argentinos.
"""
import re
import unicodedata


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
    'VENTA CONTADO', 'VENTA SEGUN COMPROBANTE',
    'NRO', 'Nº', 'N°'
}

# Sufijos empresariales (no cuentan para similitud)
SUFIJOS_EMPRESARIALES = {
    'SA', 'SRL', 'SAS', 'SACIF', 'SACI', 'SACIFIA', 'SACIFI', 'SAIC',
    'LTDA', 'CIA', 'HNOS', 'HERMANOS', 'HIJOS'
}

# Palabras genéricas que necesitan acompañamiento
PALABRAS_GENERICAS = {
    'REPUESTOS', 'REPUESTO', 'AUTOPARTES', 'AUTOPARTE',
    'DISTRIBUIDORA', 'DISTRIBUIDOR', 'SERVICIOS', 'SERVICIO',
    'COMERCIAL', 'COMERCIO', 'EMPRESA', 'EMPRESAS',
    'NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO', 'CENTRAL',
    'ARGENTINA', 'ARG', 'NACIONAL', 'INTERNACIONAL',
    'DEL', 'DE', 'LA', 'LOS', 'LAS', 'EL', 'Y', 'E', 'SAN'
}


def quitar_acentos(texto: str) -> str:
    """Elimina acentos de un texto."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )


def normalizar_nombre(nombre: str) -> str:
    """Normaliza un nombre para comparación y agrupación."""
    if not nombre:
        return ''

    n = nombre.upper().strip()
    n = quitar_acentos(n)

    # Quitar comas y reemplazar por espacio
    n = n.replace(',', ' ')

    # Normalizar sufijos empresariales
    n = re.sub(r'S\.?\s*R\.?\s*L\.?(?:\s|$)', 'SRL ', n)
    n = re.sub(r'S\.?\s*A\.?\s*S\.?(?:\s|$)', 'SAS ', n)
    n = re.sub(r'S\.?\s*A\.?(?:\s|$)', 'SA ', n)

    # Quitar puntuación
    n = re.sub(r'[^\w\s]', ' ', n)

    # Quitar espacios múltiples
    n = re.sub(r'\s+', ' ', n).strip()

    return n


def extraer_razon_social(leyenda: str) -> str:
    """
    Extrae la razón social de una leyenda contable.
    Maneja patrones específicos de sistemas contables.

    Patrones soportados:
    - "Venta según comprobante - A-0001-00039657 - NOMBRE"
    - "NOMBRE () Recibo Nº0003-00009688"
    - "VENTA CONTADO Factura A0001-00075823 (Nombre, )"
    """
    if not leyenda or not isinstance(leyenda, str):
        return 'Sin Asignar'

    texto = leyenda.strip()

    # PATRÓN 1: "Venta según comprobante - X-XXXX-XXXXXXXX - NOMBRE"
    match = re.search(
        r'[Vv]enta\s+seg[uú]n\s+comprobante\s*-\s*[A-Za-z]?-?\d+-\d+\s*-\s*(.+)$',
        texto
    )
    if match:
        nombre = match.group(1).strip()
        if len(nombre) >= 3 and es_nombre_valido(nombre):
            return normalizar_nombre(nombre)

    # PATRÓN 2: "NOMBRE () Recibo NºXXXX-XXXXXXXX" o "NOMBRE () Recibo"
    match = re.search(r'^(.+?)\s*\(\s*\)\s*[Rr]ecibo', texto)
    if match:
        nombre = match.group(1).strip()
        if len(nombre) >= 3 and es_nombre_valido(nombre):
            return normalizar_nombre(nombre)

    # PATRÓN 3: "... Factura XXXXX-XXXXXXXX (Nombre, )" - nombre entre paréntesis
    match = re.search(r'[Ff]actura\s+[A-Za-z]?\d+-\d+\s*\(([^)]+)\)', texto)
    if match:
        nombre = match.group(1).strip()
        # Limpiar comas y espacios al final
        nombre = re.sub(r'[,\s]+$', '', nombre)
        nombre = re.sub(r'^[,\s]+', '', nombre)
        if len(nombre) >= 3 and es_nombre_valido(nombre):
            return normalizar_nombre(nombre)

    # PATRÓN 4: Nombre entre paréntesis al final (genérico)
    match = re.search(r'\(([^)]{3,})\)\s*$', texto)
    if match:
        nombre = match.group(1).strip()
        nombre = re.sub(r'[,\s]+$', '', nombre)
        nombre = re.sub(r'^[,\s]+', '', nombre)
        if es_nombre_valido(nombre):
            return normalizar_nombre(nombre)

    # PATRÓN 5: Último segmento después de guión (si parece nombre)
    partes = texto.split(' - ')
    if len(partes) >= 2:
        ultima = partes[-1].strip()
        if es_nombre_valido(ultima) and len(ultima) >= 3:
            return normalizar_nombre(ultima)

    return 'Sin Asignar'


def es_nombre_valido(texto: str) -> bool:
    """Verifica si el texto parece un nombre o razón social válido."""
    if not texto or len(texto) < 3:
        return False

    t = texto.upper().strip()

    # No debe ser solo números o códigos
    if re.match(r'^[A-Z]?\d[\d\-./]*$', t):
        return False

    # Debe tener al menos 2 letras
    letras = re.sub(r'[^A-Z]', '', t)
    if len(letras) < 2:
        return False

    # No debe ser una palabra común sola
    if t in PALABRAS_COMUNES:
        return False

    # No debe empezar con palabras de transacción
    if re.match(r'^(VENTA|COMPRA|COBRO|PAGO|RECIBO|FACTURA|OP\s)', t):
        return False

    return True


def generar_clave_agrupacion(razon_social: str) -> str:
    """
    Genera una clave para agrupar variantes del mismo nombre.
    Ordena las palabras para que "ROQUE SQUILLACE" == "SQUILLACE ROQUE"
    """
    if not razon_social or razon_social == 'Sin Asignar':
        return razon_social

    clave = normalizar_nombre(razon_social)

    # Quitar sufijos empresariales
    for sufijo in SUFIJOS_EMPRESARIALES:
        clave = re.sub(rf'\b{sufijo}\b', '', clave)

    # Quitar palabras muy cortas
    palabras = [p for p in clave.split() if len(p) >= 2]

    # Filtrar palabras genéricas solo si hay otras palabras significativas
    palabras_significativas = [p for p in palabras if p not in PALABRAS_GENERICAS]
    if len(palabras_significativas) >= 1:
        palabras = palabras_significativas

    # Ordenar alfabéticamente para normalizar orden
    palabras = sorted(palabras)

    # Tomar máximo 4 palabras
    return ' '.join(palabras[:4]) if palabras else razon_social


def calcular_similitud(str1: str, str2: str) -> float:
    """
    Calcula similitud entre dos razones sociales (0 a 1).
    Detecta variantes como "SQUILLACE, ROQUE" vs "SQUILLACE ROQUE"
    """
    if not str1 or not str2:
        return 0.0

    # Normalizar ambos
    s1 = normalizar_nombre(str1)
    s2 = normalizar_nombre(str2)

    if s1 == s2:
        return 1.0

    # Si uno contiene al otro (y es significativo)
    if len(s2) >= 6 and s2 in s1:
        return 0.9
    if len(s1) >= 6 and s1 in s2:
        return 0.9

    # Extraer palabras
    def extraer_palabras(texto: str):
        palabras = texto.split()
        todas = [p for p in palabras if len(p) >= 2]
        # Palabras significativas: no son genéricas ni sufijos
        significativas = [
            p for p in todas
            if p not in SUFIJOS_EMPRESARIALES and p not in PALABRAS_GENERICAS
        ]
        return todas, significativas

    todas1, sig1 = extraer_palabras(s1)
    todas2, sig2 = extraer_palabras(s2)

    if not sig1 or not sig2:
        return 0.0

    set1 = set(sig1)
    set2 = set(sig2)

    # Coincidencias exactas
    coincidencias = len(set1 & set2)

    # Coincidencias parciales (una palabra contiene a otra, ej: "SARRIES" en "SARRIES JORGE")
    for p1 in set1:
        for p2 in set2:
            if p1 != p2 and len(p1) >= 4 and len(p2) >= 4:
                if p1 in p2 or p2 in p1:
                    coincidencias += 0.5
                    break

    # Determinar mínimo requerido
    # Si ambos tienen solo 1 palabra significativa, 1 coincidencia basta
    # Si tienen palabras genéricas, necesitan más coincidencias
    tiene_generica1 = any(p in PALABRAS_GENERICAS for p in todas1)
    tiene_generica2 = any(p in PALABRAS_GENERICAS for p in todas2)

    if len(sig1) == 1 and len(sig2) == 1:
        minimo = 1
    elif tiene_generica1 or tiene_generica2:
        # Si hay palabras genéricas, necesita más coincidencias
        minimo = 2
    else:
        minimo = 1.5

    if coincidencias < minimo:
        return 0.0

    # Calcular ratio
    total = max(len(set1), len(set2))
    return min(coincidencias / total, 1.0)


def generar_id_agrupacion(razon_social: str) -> str:
    """Genera un ID único para una agrupación."""
    import time
    base = re.sub(r'[^a-z0-9]', '_', razon_social.lower())[:50]
    return f"agrup_{base}_{int(time.time() * 1000)}"
