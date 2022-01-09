import {
  createEntityAdapter,
  createSlice,
  PayloadAction
} from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { MidiNoteEvent, PedalOffEvent } from '../../app/sagas';
import { RootState } from '../../app/store';
import { addNewMidiInputs } from './midiInputSlice';

export interface MidiNoteT {
  id: string;
  inputId: string;
  channelId: string;
  name: string;
  noteNumber: number;
  accidental: string | undefined;
  identifier: string;
  octave: number;
  noteOn: boolean;
  count: number;
  attack: number;
  release: number;
  velocity: number;
  timestamp: number;
}

const midiNoteAdapter = createEntityAdapter<MidiNoteT>({
  selectId: (note) => note.id,
});

const initialState = midiNoteAdapter.getInitialState();

const midiNoteSlice = createSlice({
  name: 'midiNotes',
  initialState,
  reducers: {
    upsertManyMidiNotes: midiNoteAdapter.upsertMany,
    updateManyMidiNotes: midiNoteAdapter.updateMany,
    updateMidiNote: midiNoteAdapter.updateOne,
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
      const noteNumber = eventData[1];
      const existingNote =
        state.entities[`${inputId}__${channel}__${noteNumber}`];
      if (existingNote) {
        if (eventType === 'noteon') {
          existingNote.noteOn = true;
          existingNote.count++;
        } else if (eventType === 'noteoff') {
          existingNote.noteOn = false;
        }
        existingNote.timestamp = timestamp;
        existingNote.velocity = velocity;
        existingNote.attack = attack;
        existingNote.release = release;
      }
    },
    handlePedalOffEvent(state, action: PayloadAction<PedalOffEvent>) {
      const { inputId, channel, values } = action.payload;
      values.forEach((noteOn, noteNum) => {
        const note = state.entities[`${inputId}__${channel}__${noteNum}`];
        if (note) note.noteOn = noteOn;
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(addNewMidiInputs, (state, action) => {
      midiNoteAdapter.upsertMany(state, action.payload.notes);
    });
  },
});

export const {
  upsertManyMidiNotes,
  updateManyMidiNotes,
  updateMidiNote,
  handleMidiNoteEvent,
  handlePedalOffEvent,
} = midiNoteSlice.actions;

export const { selectAll: selectAllMidiNotes, selectById: selectMidiNoteById } =
  midiNoteAdapter.getSelectors<RootState>((state) => state.midiNote);

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

export default midiNoteSlice.reducer;
