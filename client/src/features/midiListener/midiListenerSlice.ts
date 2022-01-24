import {
  createEntityAdapter,
  createSelector,
  createSlice,
  PayloadAction,
  Update,
} from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import {
  MidiChannelT,
  MidiInputT,
  MidiNoteT,
  AddNewMidiInputsPayload,
} from '../../utils/types';
import {
  getInitialKeyData,
  ChromaticNoteNumber,
  noteToKeyMap,
  KeyData,
  chromaticNoteNumbers,
} from '../../utils/helpers';
import { MidiNoteEvent, PedalEvent } from '../../app/sagas';
import { Midi as TonalMidi, Chord as TonalChord } from '@tonaljs/tonal';

const midiInputAdapter = createEntityAdapter<MidiInputT>({
  selectId: (input) => input.id,
});
const midiChannelAdapter = createEntityAdapter<MidiChannelT>({
  selectId: (channel) => channel.id,
});
const midiNoteAdapter = createEntityAdapter<MidiNoteT>({
  selectId: (note) => note.id,
});

const initialState = {
  inputs: midiInputAdapter.getInitialState(),
  channels: midiChannelAdapter.getInitialState(),
  notes: midiNoteAdapter.getInitialState(),
};

const midiListenerSlice = createSlice({
  name: 'midiListener',
  initialState,
  reducers: {
    addNewMidiInputs: (
      state,
      action: PayloadAction<AddNewMidiInputsPayload>
    ) => {
      midiInputAdapter.upsertMany(state.inputs, action.payload.inputs);
      midiChannelAdapter.upsertMany(state.channels, action.payload.channels);
      midiNoteAdapter.upsertMany(state.notes, action.payload.notes);
    },
    // channel reducers
    updateOneMidiChannel: (
      state,
      action: PayloadAction<Update<MidiChannelT>>
    ) => {
      midiChannelAdapter.updateOne(state.channels, action.payload);
    },
    resetKeyData(state, action: PayloadAction<{ channelId: string }>) {
      const { channelId } = action.payload;
      const existingChannel = state.channels.entities[channelId];
      if (existingChannel) {
        existingChannel.keyData = getInitialKeyData();
        existingChannel.totalNoteCount = 0;
      }
    },
    // input reducers
    updateOneMidiInput: (state, action: PayloadAction<Update<MidiInputT>>) => {
      midiInputAdapter.updateOne(state.inputs, action.payload);
    },
    handleMidiNoteEvent(state, action: PayloadAction<MidiNoteEvent>) {
      const {
        inputId,
        eventType,
        eventData,
        channel,
        timestamp,
        velocity,
        attack,
        release,
      } = action.payload;
      const existingInput = state.inputs.entities[`${inputId}`];
      // update channel
      const existingChannel = state.channels.entities[`${inputId}__${channel}`];
      if (existingInput && existingChannel) {
        const eventNoteNum = eventData[1];
        const chromaticNoteNum = (eventNoteNum % 12) as ChromaticNoteNumber;
        if (eventType === 'noteon') {
          // increment totalNoteCount
          existingChannel.totalNoteCount += 1;

          // add noteNum to notesOn in numerical order if it does not already exist in array
          let insertIndex = 0;
          for (let i = 0; i < existingChannel.notesOn.length; i++) {
            const noteNumOn = existingChannel.notesOn[i];
            if (noteNumOn === eventNoteNum) {
              insertIndex = -1;
              break;
            } else if (eventNoteNum > noteNumOn) {
              insertIndex = i + 1;
            }
          }
          if (insertIndex > -1)
            existingChannel.notesOn.splice(insertIndex, 0, eventNoteNum);

          // update keyData
          noteToKeyMap[chromaticNoteNum].forEach((keyNum) => {
            if (existingChannel.keyData[keyNum]) {
              existingChannel.keyData[keyNum].noteCount += 1;
            }
          });
        } else if (!existingInput.pedalOn && eventType === 'noteoff') {
          // update channel notesOn
          const noteIndex = existingChannel.notesOn.indexOf(eventNoteNum);
          if (noteIndex > -1) {
            existingChannel.notesOn.splice(noteIndex, 1);
          }
        }

        // update note
        const noteNumber = eventData[1];
        const existingNote =
          state.notes.entities[`${inputId}__${channel}__${noteNumber}`];
        if (existingNote) {
          if (eventType === 'noteon') {
            existingNote.noteOn = true;
            existingNote.count++;
          } else if (!existingInput.pedalOn && eventType === 'noteoff') {
            existingNote.noteOn = false;
          }
          existingNote.timestamp = timestamp;
          existingNote.velocity = velocity;
          existingNote.attack = attack;
          existingNote.release = release;
        }
      }
    },
    handlePedalEvent(state, action: PayloadAction<PedalEvent>) {
      const { inputId, channel, notesOnState, pedalOn } = action.payload;
      const existingInput = state.inputs.entities[`${inputId}`];
      const existingChannel = state.channels.entities[`${inputId}__${channel}`];
      if (existingInput && existingChannel) {
        existingInput.pedalOn = existingInput.reversePedal ? !pedalOn : pedalOn;

        // remove all notes from channel.notesOn if they are no longer on after pedal release
        if (!existingInput.pedalOn) {
          let updatedNotesOn: number[] = [];
          existingChannel.notesOn.forEach((noteNum) => {
            const noteOn = notesOnState[noteNum];
            // update channel.notesOn
            if (noteOn) updatedNotesOn.push(noteNum);
            // update note.noteOn
            const existingNote =
              state.notes.entities[`${inputId}__${channel}__${noteNum}`];
            if (existingNote) existingNote.noteOn = noteOn;
          });
          existingChannel.notesOn = updatedNotesOn;
        }
      }
    },
  },
});

export const {
  addNewMidiInputs,
  resetKeyData,
  updateOneMidiInput,
  updateOneMidiChannel,
  handleMidiNoteEvent,
  handlePedalEvent,
} = midiListenerSlice.actions;

// input selectors
export const {
  selectAll: selectAllMidiInputs,
  selectEntities: selectMidiInputEntities,
  selectById: selectMidiInputById,
} = midiInputAdapter.getSelectors<RootState>(
  (state) => state.midiListener.inputs
);

// channel selectors
export const { selectAll: selectAllMidiChannels } =
  midiChannelAdapter.getSelectors<RootState>(
    (state) => state.midiListener.channels
  );

const getChannelKeyDataById = (
  state: RootState,
  channelId: string
): null | KeyData => {
  const channel = state.midiListener.channels.entities[channelId];
  if (channel) return channel.keyData;
  return null;
};
const getChannelTotalNoteCountById = (
  state: RootState,
  channelId: string
): number => {
  const channel = state.midiListener.channels.entities[channelId];
  if (channel) return channel.totalNoteCount;
  return 0;
};
// return an array of 12 floats between 0-1 (where each index represents a key, 0 = C, 1 = C#, ...)
// indicating the percentage of notes played found in each key
export const selectKeyPrevalenceById = createSelector(
  [getChannelKeyDataById, getChannelTotalNoteCountById],
  (keyData, totalNoteCount) => {
    return chromaticNoteNumbers.map((chromaticNum) => {
      if (keyData && totalNoteCount > 0) {
        return keyData[chromaticNum].noteCount / totalNoteCount;
      }
      return 1;
    });
  }
);

export const selectChannelKey = createSelector(
  [
    (state: RootState, channelId: string) => {
      const channel = state.midiListener.channels.entities[channelId];
      if (channel) return channel.selectedKey;
      return 'C';
    },
  ],
  (key) => key
);

export const selectChordEstimate = createSelector(
  [
    (state: RootState, channelId: string): string => {
      const channel = state.midiListener.channels.entities[channelId];
      if (channel) {
        // use tonaljs to estimated chords
        const estimatedChords = TonalChord.detect(
          channel.notesOn.map((noteNum) =>
            TonalMidi.midiToNoteName(noteNum, {
              sharps: channel.selectedKeyUsesSharps,
            })
          )
        );
        return JSON.stringify(estimatedChords);
      }
      return '[]';
    },
  ],
  (chords) => chords
);

export const selectNotesOnStr = createSelector(
  [
    (state: RootState, channelId: string): string => {
      const channel = state.midiListener.channels.entities[channelId];
      if (channel) {
        return JSON.stringify(channel.notesOn);
      }
      return '[]';
    },
  ],
  (notesOnStr) => notesOnStr
);

// note selectors
export const { selectAll: selectAllMidiNotes, selectById: selectMidiNoteById } =
  midiNoteAdapter.getSelectors<RootState>((state) => state.midiListener.notes);

const getMidiNoteOn = (
  state: RootState,
  channelId: string,
  noteNum: number
) => {
  const note = selectMidiNoteById(state, `${channelId}__${noteNum}`);
  if (note) return note.noteOn;
  return false;
};
export const selectNoteOnByChannelId = createSelector(
  [getMidiNoteOn],
  (noteOn) => {
    return noteOn;
  }
);

export default midiListenerSlice.reducer;
