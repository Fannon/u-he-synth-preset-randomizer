import { ParamsModel } from "./analyzer";
import { preset, getKeyForParam } from "./parser";
import { PresetLibrary } from "./presetLibrary";
import { log } from "./utils/log";
import { uniqueNamesGenerator, adjectives, colors, names } from "unique-names-generator";
import { getConfig  } from "./config";

const config = getConfig()

/**
 * Fully randomized presets, with real values from library
 */
export function generateFullyRandomPresets(
  presetLibrary: PresetLibrary,
  paramModel: ParamsModel,
  number: number
): PresetLibrary {
  const newPresetLibrary: PresetLibrary = {
    presetRootFolder: presetLibrary.presetRootFolder + '/RANDOM',
    presets: []
  }
  for (let i = 0; i < number; i++) {

    const randomPreset: preset = JSON.parse(
      JSON.stringify(getRandomArrayItem(presetLibrary.presets))
    );

    for (const param of randomPreset.params) {
      const key = getKeyForParam(param);
      const randomParamValue = getRandomArrayItem(paramModel[key]!.values);
      if (config.debug && param.value !== randomParamValue) {
        log.debug(`  ${key}: Old: ${param.value} -> New: ${randomParamValue}`);
      }
      param.value = randomParamValue;
    }

    const randomName = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, names],
      separator: " ",
      style: "capital",
    });

    randomPreset.filePath = `/RND ${randomName}.h2p`;
    randomPreset.presetName = `RND ${randomName}`;
    randomPreset.meta = [
      {
        "key": "Author",
        "value": "Random Generator"
      },
      {
        "key": "Description",
        "value": "Fully random preset, generated by https://github.com/Fannon/u-he-preset-randomizer"
      }
    ],

    log.info(`Generated random preset: ${randomPreset.filePath}`);
    newPresetLibrary.presets.push(randomPreset)
  }
  return newPresetLibrary;
}


/**
 * Fully randomized presets, with real values from library
 */
export function generateRandomizedPresets(
  presetLibrary: PresetLibrary,
  paramModel: ParamsModel,
  presetName: string,
  randomness: number,
  number: number
): PresetLibrary {
  const newPresetLibrary: PresetLibrary = {
    presetRootFolder: presetLibrary.presetRootFolder + '/RANDOM',
    presets: []
  }

  const basePreset = presetLibrary.presets.find((el) => {
    return el.filePath.includes(presetName)
  })

  if (!basePreset) {
    log.error(`No preset with name ${presetName} found!`)
    process.exit(1)
  }

  const randomRatio = Math.min(Math.max(0, randomness / 100), 100);
  const stableRatio = 1 - randomRatio;

  log.silly('randomRatio', randomRatio)

  for (let i = 0; i < number; i++) {
    const randomPreset: preset = JSON.parse(JSON.stringify(basePreset));
    for (const param of randomPreset.params) {
      const key = getKeyForParam(param);

      const randomParamValue = getRandomArrayItem(paramModel[key]!.values);
      const oldParamValue = JSON.parse(JSON.stringify(param.value))
      let newParamValue = JSON.parse(JSON.stringify(randomParamValue));

      if (newParamValue !== oldParamValue) {

        if (param.type !== 'string') {
          newParamValue = ((oldParamValue as number * stableRatio) + (newParamValue * randomRatio))

          if (param.type === 'integer') {
            newParamValue = Math.round(newParamValue);
          } else if (param.type === 'float') {
            newParamValue = Math.trunc(newParamValue * 100) / 100;
          }
        } else {
          // Randomly decide between the two values by randomness ratio
          if (Math.random() > randomRatio) {
            newParamValue = oldParamValue; // Revert to old value if random threshold is not met
          }
        }
  
        if (config.debug && param.value !== newParamValue) {
          log.debug(`  ${key}: ${param.value} -> ${randomParamValue} -> ${newParamValue}`);
        }
        param.value = newParamValue;

      }
    }

    const randomName = uniqueNamesGenerator({
      dictionaries: [adjectives, colors],
      separator: " ",
      style: "capital",
    });

    randomPreset.filePath = `/RND ${randomName} ${randomPreset.presetName}.h2p`;
    randomPreset.presetName = `RND ${randomName} ${randomPreset.presetName}`;

    log.info(`Generated random preset: ${randomPreset.filePath}`);
    newPresetLibrary.presets.push(randomPreset)
  }
  return newPresetLibrary;
}

//////////////////////////////////////////
// HELPER FUNCTIONS                     //
//////////////////////////////////////////

export function getRandomArrayItem(list: any[]) {
  return list[Math.floor(Math.random() * list.length)];
}
