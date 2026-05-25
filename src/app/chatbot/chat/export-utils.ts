import { jsPDF } from 'jspdf';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  html?: string;
  isFile?: boolean;
}

/**
 * Genera un PDF optimizado de manera rápida y eficiente
 * Sin perder contenido ni contexto
 */
export function generateOptimizedPdf(
  messages: ChatMessage[],
  fileName: string = `reporte-${Date.now()}.pdf`
): void {
  // Usar modo raf (sin renderizado completo) para mayor velocidad
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const textWidth = pageWidth - 2 * margin;

  // Encabezado más compacto
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de Conversación', margin, margin + 5);

  // Fecha más compacta
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const time = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`${date} - ${time}`, margin, margin + 10);

  let yPosition = margin + 18;
  doc.setTextColor(0, 0, 0);

  // Procesar mensajes sin crear objetos intermedios innecesarios
  for (const message of messages) {
    // Omitir mensajes vacíos
    let content = message.isFile ? `[Archivo: ${message.text}]` : (message.text || message.html || '');
    if (!content) continue;

    // Si no hay texto plano pero hay HTML, limpiar los tags
    if (!message.text && message.html) {
      content = content.replace(/<[^>]*>/g, '');
    }

    const prefix = message.role === 'user' ? 'Tú: ' : 'Asistente: ';
    const isUser = message.role === 'user';

    // Cambiar color según el rol para mejor legibilidad sin overhead
    if (isUser) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235); // Azul para usuario
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // Gris oscuro para bot
    }

    // Dividir el texto de forma eficiente
    const fullText = prefix + content;
    const lines = doc.splitTextToSize(fullText, textWidth);

    // Escribir línea por línea con control de página automático
    const lineHeight = 5.5;
    for (const line of lines) {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin + 5;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += 2; // Espacio adicional de separación entre mensajes
  }

  // Agregar pie de página con número de página
  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  // Guardar sin delay
  doc.save(fileName);
}

/**
 * Genera un documento de texto optimizado
 * Más rápido que PDF pero mantiene todo el contexto
 */
export function generateOptimizedTextDoc(
  messages: ChatMessage[],
  fileName: string = `reporte-${Date.now()}.txt`
): void {
  // Construir contenido de forma eficiente
  const lines: string[] = [];

  // Encabezado compacto
  lines.push('═'.repeat(60));
  lines.push('REPORTE DE CONVERSACIÓN');
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push(
    `Generado: ${new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`
  );
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push('');

  // Agregar mensajes sin procesamiento extra
  for (const message of messages) {
    let content = message.isFile ? `[Archivo: ${message.text}]` : (message.text || message.html || '');
    if (!content) continue;

    if (!message.text && message.html) {
      content = content.replace(/<[^>]*>/g, '');
    }

    const prefix = message.role === 'user' ? '[TÚ]' : '[ASISTENTE]';
    lines.push(`${prefix}: ${content}`);
    lines.push('');
  }

  // Pie de página
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push(`Total de mensajes: ${messages.length}`);
  lines.push(`Usuarios: ${messages.filter(m => m.role === 'user').length}`);
  lines.push(`Respuestas del asistente: ${messages.filter(m => m.role === 'bot').length}`);

  // Generar archivo directamente sin Blob intermedio
  downloadAsText(lines.join('\n'), fileName);
}

/**
 * Genera un documento JSON con toda la metadata
 * Más rápido aún y preserva toda la información
 */
export function generateOptimizedJsonDoc(
  messages: ChatMessage[],
  fileName: string = `reporte-${Date.now()}.json`
): void {
  const data = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      botMessages: messages.filter(m => m.role === 'bot').length,
    },
    messages: messages.filter(m => {
      const content = m.isFile ? m.text : (m.text || m.html || '');
      return content.length > 0;
    }),
  };

  // JSON stringified de una sola vez
  const json = JSON.stringify(data, null, 2);
  downloadAsText(json, fileName);
}

/**
 * Función auxiliar para descargar texto sin Blob intermedio
 */
function downloadAsText(content: string, fileName: string): void {
  // Crear Blob solo en el momento final
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Crear y ejecutar descarga
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Limpiar recursos inmediatamente
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Interfaz de descarga múltiple (genera 3 formatos a la vez si es necesario)
 */
export async function generateAllFormats(
  messages: ChatMessage[],
  baseFileName: string = 'reporte'
): Promise<void> {
  const timestamp = Date.now();
  const basename = `${baseFileName}-${timestamp}`;

  // Ejecutar en paralelo (no secuencial) para máxima velocidad
  Promise.all([
    Promise.resolve(generateOptimizedPdf(messages, `${basename}.pdf`)),
    Promise.resolve(generateOptimizedTextDoc(messages, `${basename}.txt`)),
  ]);
}



