import FirstPageIcon from '@mui/icons-material/FirstPage';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Button, Tooltip } from '@mui/material';
import { Box } from '@mui/system';
import { Storage } from 'aws-amplify';
import MidiPlayer from 'midi-player-js';
import { useCallback, useEffect, useRef } from 'react';
import { MidiNoteEvent } from '../../app/sagas';
import { useAppDispatch } from '../../app/store';
import { useMsStyles } from '../../assets/styles/styleHooks';
import FileSelector from '../drawerContainer/FileSelector';
import { updateOneMidiBlock } from '../midiBlock/midiBlockSlice';
import {
  addNewMidiInputs,
  deleteMidiInputs,
  handleMidiNoteEvent,
} from '../midiListener/midiListenerSlice';
import { mapWebMidiInputs } from '../midiListener/webMidiUtils';
interface MidiFilePlayerProps {
  containerWidth: number;
  containerHeight: number;
  blockId: string;
  midiFilePlayerSettings: MidiFilePlayerSettingsT;
}
function MidiFilePlayer({
  blockId,
  containerHeight,
  containerWidth,
  midiFilePlayerSettings,
}: MidiFilePlayerProps) {
  const msClasses = useMsStyles();
  const dispatch = useAppDispatch();
  const midiPlayers = useRef<MidiPlayerMap>({});

  // run when midiFilePlayerSettings.selectedMidiFiles changes
  useEffect(() => {
    const fileInputs: WebMidiInputT[] = [];
    const updatedMidiPlayers: MidiPlayerMap = {};

    // remove deselected files from midiListener inputs
    const deselectedFiles = Object.keys(midiPlayers.current).filter(
      (id1) =>
        !midiFilePlayerSettings.selectedMidiFiles.some(
          ({ key: id2 }) => id2 === id1
        )
    );
    dispatch(deleteMidiInputs(deselectedFiles));

    // generate midiPlayers and midiListener inputs for each selected file
    midiFilePlayerSettings.selectedMidiFiles.forEach((selectedMidiFile) => {
      // add midiPlayer
      Storage.get(selectedMidiFile.key, {
        level: 'public',
        cacheControl: 'no-cache',
        download: true,
      }).then((result) => {
        const midiBlob: Blob = result.Body as Blob;
        midiBlob.arrayBuffer().then((arrBuff) => {
          // TODO: make sure events are handled properly
          const newMidiPlayer = new MidiPlayer.Player((event: any) => {
            if (event.name === 'Note on') {
              const eventType = event.velocity > 0 ? 'noteon' : 'noteoff';
              const eventPayload: MidiNoteEvent = {
                eventHandler: 'note',
                inputId: selectedMidiFile.key,
                eventType: eventType,
                eventData: [
                  eventType === 'noteon' ? 144 : 128,
                  event.noteNumber,
                  0,
                ],
                channel: 1,
                timestamp: 0,
                velocity: event.velocity,
                attack: 0,
                release: 0,
              };
              dispatch(handleMidiNoteEvent(eventPayload));
            }
          });
          newMidiPlayer.loadArrayBuffer(arrBuff);
          updatedMidiPlayers[selectedMidiFile.key] = newMidiPlayer;
        });
      });

      // generate fileInputs to upsert to midiListener inputs/channels/notes
      fileInputs.push({
        eventsSuspended: false,
        _octaveOffset: 0,
        _midiInput: {
          id: selectedMidiFile.key,
          manufacturer: '',
          name: selectedMidiFile.filename,
          connection: '',
          state: '',
          type: 'midi_file',
          version: '',
        },
        channels: [
          {
            _octaveOffset: 0,
            eventsSuspended: false,
            _number: 1,
          },
        ],
      });
    });

    // update midiPlayers
    midiPlayers.current = updatedMidiPlayers;

    // update midiListener
    const { inputs, channels, notes } = mapWebMidiInputs(fileInputs);
    dispatch(addNewMidiInputs({ inputs, channels, notes }));
  }, [midiFilePlayerSettings.selectedMidiFiles, dispatch]);

  const onMidiFilesChange = (value: UploadedFileT | UploadedFileT[] | null) => {
    if (Array.isArray(value)) {
      dispatch(
        updateOneMidiBlock({
          id: blockId,
          changes: {
            midiFilePlayerSettings: {
              ...midiFilePlayerSettings,
              selectedMidiFiles: value,
            },
          },
        })
      );
    }
  };

  const resetInputNotes = useCallback(() => {
    midiFilePlayerSettings.selectedMidiFiles.forEach((file) => {
      dispatch(
        handleMidiNoteEvent({
          eventHandler: 'note',
          inputId: file.key,
          eventType: 'TURN_OFF_ACTIVE_NOTES',
          eventData: [0, 0, 0],
          channel: 1,
          timestamp: 0,
          velocity: 0,
          attack: 0,
          release: 0,
        })
      );
    });
  }, [midiFilePlayerSettings.selectedMidiFiles, dispatch]);

  return (
    <Box sx={{ width: containerWidth, height: containerHeight }}>
      <Box>MidiFilePlayer</Box>
      <Box>
        <FileSelector
          selectLabel="Select Midi File(s)"
          folder="midi"
          blockId={blockId}
          multi={true}
          multiSelectValue={midiFilePlayerSettings.selectedMidiFiles.map(
            (x) => x.key
          )}
          onSelectChange={onMidiFilesChange}
        />
      </Box>
      <Box>
        <Tooltip arrow title="Replay" placement="top">
          <Button
            variant="contained"
            color="primary"
            className={msClasses.iconButton}
            onClick={() => {
              Object.keys(midiPlayers.current).forEach((fileKey) => {
                midiPlayers.current[fileKey].resetTracks();
                midiPlayers.current[fileKey].skipToPercent(0);
                resetInputNotes();
              });
            }}
            aria-label="replay"
          >
            <FirstPageIcon />
          </Button>
        </Tooltip>
        <Tooltip arrow title="Pause" placement="top">
          <Button
            variant="contained"
            color="primary"
            className={msClasses.iconButton}
            onClick={() => {
              Object.keys(midiPlayers.current).forEach((fileKey) => {
                midiPlayers.current[fileKey].pause();
              });
            }}
            aria-label="pause"
          >
            <PauseIcon />
          </Button>
        </Tooltip>
        <Tooltip arrow title="Play" placement="top">
          <Button
            variant="contained"
            color="primary"
            className={msClasses.iconButton}
            onClick={() => {
              Object.keys(midiPlayers.current).forEach((fileKey) => {
                midiPlayers.current[fileKey].play();
              });
            }}
            aria-label="play"
          >
            <PlayArrowIcon />
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
}

interface MidiPlayerMap {
  [key: string]: MidiPlayer.Player;
}

export default MidiFilePlayer;
