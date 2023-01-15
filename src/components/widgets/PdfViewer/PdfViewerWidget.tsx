import { Box } from '@mui/material';
import { Storage } from 'aws-amplify';
import React, { useEffect, useState } from 'react';
import { useNotificationDispatch } from '../../../utils/hooks';
import { useAppDispatch } from '../../../redux/store';
import FileSelector from '../../utilComponents/FileSelector';
import { updateOneMidiBlock } from '../../../redux/slices/midiBlockSlice';
import PdfViewerSettings from './PdfViewerSettings';
import { Document, Page, pdfjs } from 'react-pdf';

interface PdfViewerProps {
  containerWidth: number;
  containerHeight: number;
  block: MidiBlockT;
  pdfFile: any;
}
function PdfViewer({
  containerHeight,
  containerWidth,
  block,
  pdfFile,
}: PdfViewerProps) {
  return (
    <Box
      sx={{
        height: containerHeight,
        width: containerWidth,
        overflow: 'auto',
      }}
    >
      <ReactPdfWrapper pdfFile={pdfFile} containerWidth={containerWidth} />
    </Box>
  );
}

const ReactPdfWrapper = React.memo(
  ({
    pdfFile,
    containerWidth,
  }: {
    pdfFile: string;
    containerWidth: number;
  }) => {
    console.log('pdfFile: ', pdfFile);
    const [numPages, setNumPages] = useState(0);
    const pages = [];
    for (let i = 1; i <= numPages; i++) {
      pages.push(
        <Page
          pageNumber={i}
          width={containerWidth - 8}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      );
    }

    useEffect(() => {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
    }, []);

    return pdfFile ? (
      <Box>
        <Document
          file={{
            url: pdfFile,
          }}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
          }}
        >
          {pages}
        </Document>
      </Box>
    ) : (
      <Box>Missing PDF!</Box>
    );
  }
);

const withPdfFile = (
  WrappedComponent: React.FunctionComponent<PdfViewerProps>
) => {
  const WithPdfFile = (props: PdfViewerProps) => {
    const { block } = props;
    const [pdfFile, setPdfFile] = useState<any>(null);
    const notificationDispatch = useNotificationDispatch();

    useEffect(() => {
      if (block.pdfViewerSettings.selectedFile) {
        Storage.get(block.pdfViewerSettings.selectedFile.key, {
          level: 'public',
          cacheControl: 'no-cache',
          // download: true,
        })
          .then((result) => {
            setPdfFile(result);
          })
          .catch((err) => {
            notificationDispatch(
              `An error occurred while loading your file. Please try refreshing the page or contact support for help.`,
              'error',
              `Storage.get failed! ${err}`,
              8000
            );
          });
      }
    }, [block.pdfViewerSettings.selectedFile, notificationDispatch]);

    if (pdfFile === null) {
      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              textAlign: 'center',
            }}
          >
            <PdfFileSelector
              pdfViewerSettings={block.pdfViewerSettings}
              blockId={block.id}
            />
          </Box>
        </Box>
      );
    }
    return <WrappedComponent {...props} pdfFile={pdfFile} />;
  };
  return WithPdfFile;
};

export const PdfFileSelector = ({
  blockId,
  pdfViewerSettings,
}: {
  blockId: string;
  pdfViewerSettings: PdfViewerSettingsT;
}) => {
  const dispatch = useAppDispatch();
  return (
    <FileSelector
      selectLabel="Select PDF File"
      folder="pdf"
      blockId={blockId}
      onSelectChange={(value) => {
        if (!Array.isArray(value)) {
          dispatch(
            updateOneMidiBlock({
              id: blockId,
              changes: {
                pdfViewerSettings: {
                  ...pdfViewerSettings,
                  selectedFile: value,
                },
              },
            })
          );
        }
      }}
      selectValue={
        pdfViewerSettings.selectedFile ? pdfViewerSettings.selectedFile.key : ''
      }
    />
  );
};

const exportObj: WidgetModule = {
  name: 'PDF Viewer',
  Component: withPdfFile(PdfViewer),
  SettingComponent: PdfViewerSettings,
  ButtonsComponent: null,
  defaultSettings: {}, // pdfViewerSettings is handled on its own (not using widgetSettings)
  includeBlockSettings: [],
  orderWeight: 2.5, // used to determine the ordering of the options in the Widget selector
};

export default exportObj;
