import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  Button,
  Checkbox,
  FormControl,
  Grid,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '../../app/store';
import { useBlockSettingStyles } from '../../assets/styles/styleHooks';
import { OSMDSettingsT } from '../../utils/helpers';
import { MidiBlockT, updateOneMidiBlock } from '../midiBlock/midiBlockSlice';
import { OSMDFileSelector } from '../widgets/OSMDView/OSMDUtils';
import { DrawerFooter } from './DrawerFooter';

interface OSMDSettingsProps {
  block: MidiBlockT;
}
function OSMDSettings({ block }: OSMDSettingsProps) {
  const classes = useBlockSettingStyles();
  const dispatch = useAppDispatch();
  const [osmdSettings, setOSMDSettings] = useState(block.osmdSettings);
  const [settingChanged, setSettingChanged] = useState(false);

  useEffect(() => {
    setOSMDSettings(block.osmdSettings);
  }, [block.osmdSettings]);

  const saveChanges = () => {
    setSettingChanged(false);
    dispatch(
      updateOneMidiBlock({
        id: block.id,
        changes: {
          osmdSettings: osmdSettings,
        },
      })
    );
  };

  const updateSettings = (updatedOSMDSettings: OSMDSettingsT) => {
    setSettingChanged(true);
    setOSMDSettings(updatedOSMDSettings);
  };

  const handleSliderChange =
    (setting: keyof OSMDSettingsT) =>
    (event: Event, newValue: number | number[]) => {
      updateSettings({
        ...osmdSettings,
        [setting]: newValue as number,
      });
    };

  const handleCheckboxClick = (setting: keyof OSMDSettingsT) => () => {
    updateSettings({
      ...osmdSettings,
      [setting]: !osmdSettings[setting],
    });
  };

  const handleInputChange =
    (setting: keyof OSMDSettingsT) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateSettings({
        ...osmdSettings,
        [setting]: parseInt(event.target.value),
      });
    };

  const selectTextOnFocus = (event: React.FocusEvent<HTMLInputElement>) =>
    event.target.select();

  return (
    <>
      {/* <Grid key="osmd-divider" item xs={12}>
        <DividerWithText hideBorder>Sheet Music Settings</DividerWithText>
      </Grid> */}

      <Grid item xs={12}>
        <OSMDFileSelector osmdSettings={osmdSettings} blockId={block.id} />
      </Grid>

      <Grid item xs={12}>
        <FormControl className={classes.select} size="small" fullWidth>
          <TextField
            size="small"
            label="Start Measure"
            type="number"
            value={osmdSettings.drawFromMeasureNumber}
            onChange={handleInputChange('drawFromMeasureNumber')}
            onFocus={selectTextOnFocus}
          />
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl className={classes.select} size="small" fullWidth>
          <TextField
            size="small"
            label="End Measure"
            helperText="0 will display all measures until the end"
            type="number"
            value={osmdSettings.drawUpToMeasureNumber}
            onChange={handleInputChange('drawUpToMeasureNumber')}
            onFocus={selectTextOnFocus}
          />
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Box>
          <Typography variant="body1" id="zoom" gutterBottom>
            Zoom:
            <Typography component="span" fontWeight={500}>
              {' '}
              {`${osmdSettings.zoom}x`}
            </Typography>
          </Typography>
          <Slider
            value={osmdSettings.zoom}
            onChange={handleSliderChange('zoom')}
            aria-labelledby="zoom"
            step={0.1}
            min={0.25}
            max={3}
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box
          onClick={handleCheckboxClick('showCursor')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          className={classes.checkbox}
        >
          <Checkbox checked={osmdSettings.showCursor} />
          <Typography variant="body1">Show Audio Player</Typography>
          <Tooltip
            arrow
            title="If enabled, cursor also moves when correct notes are hit on selected midi input."
            placement="top"
          >
            <HelpOutlineIcon color="secondary" sx={{ ml: 2 }} />
          </Tooltip>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box
          onClick={handleCheckboxClick('iterateCursorOnInput')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          className={classes.checkbox}
        >
          <Checkbox checked={osmdSettings.iterateCursorOnInput} />
          <Typography variant="body1">Iterate Cursor On Input Match</Typography>
          <Tooltip
            arrow
            title="If the notes pressed on your midi input match the notes under the cursor, then iterate to the next note(s)."
            placement="top"
          >
            <HelpOutlineIcon color="secondary" sx={{ ml: 2 }} />
          </Tooltip>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box>
          <Typography variant="body1" id="playbackVolume" gutterBottom>
            Playback Volume:
            <Typography component="span" fontWeight={500}>
              {' '}
              {`${osmdSettings.playbackVolume}`}
            </Typography>
          </Typography>
          <Slider
            value={osmdSettings.playbackVolume}
            onChange={handleSliderChange('playbackVolume')}
            aria-labelledby="playbackVolume"
            step={1}
            min={0}
            max={100}
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box>
          <Typography variant="body1" id="metronomeVolume" gutterBottom>
            Metronome Volume:
            <Typography component="span" fontWeight={500}>
              {' '}
              {`${osmdSettings.metronomeVolume}`}
            </Typography>
          </Typography>
          <Slider
            value={osmdSettings.metronomeVolume}
            onChange={handleSliderChange('metronomeVolume')}
            aria-labelledby="metronomeVolume"
            step={1}
            min={0}
            max={100}
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <FormControl className={classes.select} size="small" fullWidth>
          <TextField
            size="small"
            label="Metronome count in beats"
            type="number"
            value={osmdSettings.metronomeCountInBeats}
            onChange={handleInputChange('metronomeCountInBeats')}
            onFocus={selectTextOnFocus}
          />
        </FormControl>
      </Grid>
      {/* <Grid item xs={12}>
        <Box
          onClick={handleCheckboxClick('drawTitle')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          className={classes.checkbox}
        >
          <Checkbox checked={osmdSettings.drawTitle} />
          <Typography variant="body1">Show Title</Typography>
        </Box>
      </Grid> */}
      {/* <Grid item xs={12}>
        <Box
          onClick={handleCheckboxClick('colorNotes')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          className={classes.checkbox}
        >
          <Checkbox checked={osmdSettings.colorNotes} />
          <Typography variant="body1">Color Notes</Typography>
        </Box>
      </Grid> */}
      {settingChanged && (
        <DrawerFooter>
          <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', zIndex: 1 }}>
            <Button
              sx={{ width: '100%' }}
              onClick={saveChanges}
              variant="contained"
            >
              Save Changes
            </Button>
          </Box>
        </DrawerFooter>
      )}
    </>
  );
}

export default OSMDSettings;