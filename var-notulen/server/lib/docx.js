const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

function formatDate(iso) {
  return new Date(iso).toLocaleString('nl-NL', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

async function buildMeetingDocx(meeting, fullText) {
  const paragraphs = [
    new Paragraph({
      text: meeting.title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Opgenomen op ${formatDate(meeting.createdAt)}`,
          italics: true,
          color: '666666',
        }),
      ],
    }),
    new Paragraph({ text: '' }),
  ];

  const bodyLines = fullText.split('\n').filter((l) => l.trim() !== '');
  if (bodyLines.length === 0) {
    paragraphs.push(new Paragraph({ text: '(Nog geen transcript beschikbaar)' }));
  } else {
    for (const line of bodyLines) {
      paragraphs.push(new Paragraph({ text: line }));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildMeetingDocx };
