import { ParamsModel } from "./analyzer";
import { Preset } from "./parser";
import { PresetLibrary } from "./presetLibrary";
import { log } from "./utils/log";
import { uniqueNamesGenerator, adjectives, colors, names } from "unique-names-generator";
import { Config, getConfig  } from "./config";

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

    const randomPreset: Preset = JSON.parse(
      JSON.stringify(getRandomArrayItem(presetLibrary.presets))
    );

    for (const param of randomPreset.params) {
      const randomParamValue = getRandomArrayItem(paramModel[param.id]!.values);
      if (config.debug && param.value !== randomParamValue) {
        log.debug(`  ${param.id}: Old: ${param.value} -> New: ${randomParamValue}`);
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
 * Randomize a given preset, with specific randomization ratio
 */
export function generateRandomizedPresets(
  presetLibrary: PresetLibrary,
  paramModel: ParamsModel,
  config: Config,
  preset?: Preset 
): PresetLibrary {
  const newPresetLibrary: PresetLibrary = {
    presetRootFolder: presetLibrary.presetRootFolder + '/RANDOM',
    presets: []
  }

  // If preset is passed in via argument, don't search in PresetLibrary via --preset parameter
  const basePreset = preset || presetLibrary.presets.find((el) => {
    return el.filePath.includes(config.preset)
  })

  if (!basePreset) {
    log.error(`No preset with name ${config.preset} found!`)
    process.exit(1)
  }

  const randomRatio = Math.min(Math.max(0, config.randomness / 100), 100);
  const stableRatio = 1 - randomRatio;

  for (let i = 0; i < config.amount; i++) {
    const randomPreset: Preset = JSON.parse(JSON.stringify(basePreset));
    for (const param of randomPreset.params) {

      const randomParamValue = getRandomArrayItem(paramModel[param.id]!.values);
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
          log.debug(`  ${param.id}: ${param.value} -> ${randomParamValue} -> ${newParamValue}`);
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

/**
 * Merge multiple presets together, with randomization amount
 */
export function generateMergedPresets(
  presetLibrary: PresetLibrary,
  config: Config
): PresetLibrary {
  const newPresetLibrary: PresetLibrary = {
    presetRootFolder: presetLibrary.presetRootFolder + '/RANDOM',
    presets: []
  }

  const mergePresets: Preset[] = []

  if (config.preset) {
    const basePreset = presetLibrary.presets.find((el) => {
      return el.filePath.includes(config.preset)
    })
    if (!basePreset) {
      log.error(`No preset with name ${config.preset} found!`)
      process.exit(1)
    }
    mergePresets.push(basePreset)
  }

  if (!Array.isArray(config.merge)) {
    config.merge = [config.merge]
  }

  for (const presetTitle of config.merge) {
    const mergePreset = presetLibrary.presets.find((el) => {
      return el.filePath.includes(presetTitle)
    })
    if (!mergePreset) {
      log.error(`No preset with name ${config.preset} found!`)
      process.exit(1)
    }
    mergePresets.push(mergePreset)
  }

  log.info(`Merging presets: ${mergePresets.map((el) => el.presetName).join(', ')}`)

  // Create random ratios, that still add up to 1 total
  const randomNumbers: number[] = []
  let randomTotal = 0;
  for (const _preset of mergePresets) {
    const rnd = Math.random()
    randomNumbers.push(rnd);
    randomTotal += rnd;
  }
  const mergeRatios = randomNumbers.map((el) => {
    return el / randomTotal
  })

  for (let i = 0; i < config.amount; i++) {
    const newPreset: Preset = JSON.parse(JSON.stringify(getRandomArrayItem<Preset>(mergePresets)));

    for (const param of newPreset.params) {
      const oldParamValue = JSON.parse(JSON.stringify(param.value))
      let newParamValue = oldParamValue;

      if (param.type === 'string') {
        // Randomly pick a string enum value from one of the merge patches
        const pick = getRandomArrayItem<Preset>(mergePresets)
        newParamValue = pick.params.find((el) => el.id === param.id); 
      } else {

        let newParamValue = 0;

        for (const [i, preset] of mergePresets.entries()) {
          const findParam = preset.params.find((el) => el.id === param.id)
          if (findParam) {
            newParamValue += (findParam.value as number) * mergeRatios[i]
          } else {
            newParamValue += oldParamValue * mergeRatios[i]
          }
        }

        if (param.type === 'integer') {
          newParamValue = Math.round(newParamValue);
        } else if (param.type === 'float') {
          newParamValue = Math.trunc(newParamValue * 100) / 100;
        }

      }

      if (config.debug && param.value !== newParamValue) {
        log.debug(`  ${param.id}: ${param.value} -> ${newParamValue}`);
      }

    }

    const randomName = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, names],
      separator: " ",
      style: "capital",
    });

    newPreset.filePath = `/RND ${randomName}.h2p`;
    newPreset.presetName = `RND ${randomName}`;
    newPreset.meta = [
      {
        "key": "Author",
        "value": "Random Generator"
      },
      {
        "key": "Description",
        "value": `Merged preset, based on ${mergePresets.map((el) => el.presetName).join(', ')}. Generated by https://github.com/Fannon/u-he-preset-randomizer`
      }
    ],

    log.info(`Generated merged preset: ${newPreset.filePath}`);
    newPresetLibrary.presets.push(newPreset)
  }
  return newPresetLibrary;
}

//////////////////////////////////////////
// HELPER FUNCTIONS                     //
//////////////////////////////////////////

export function getRandomArrayItem<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}
