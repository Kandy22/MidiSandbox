import { Grid } from '@mui/material';
import { PdfFileSelector } from './PdfViewerWidget';

interface PdfViewerSettingsProps {
  block: MidiBlockT;
}
function PdfViewerSettings({ block }: PdfViewerSettingsProps) {
  return (
    <>
      <Grid item xs={12}>
        <PdfFileSelector
          pdfViewerSettings={block.pdfViewerSettings}
          blockId={block.id}
        />
      </Grid>
    </>
  );
}

export default PdfViewerSettings;
