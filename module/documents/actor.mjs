/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class DemakeActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.demake || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

  }

  /**
   * Prepare Antagonist Specific Data
   */
  
  _prepareAntagonistData(actorData) {
    if (actorData.type !== 'antagonist') return;

  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    //if (data.abilities) {
    //  for (let [k, v] of Object.entries(data.abilities)) {
    //    data[k] = foundry.utils.deepClone(v);
    //  }
    //}

    // Add level for easier access, or fall back to 0. TODO REMOVE THIS.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
SystemChanges
    // Add Essence as a shorthand, or fallback to 0. 
    if (data.base.essence) {
      data.essence = data.base.essence.value ?? 0;
    }
  }

  _getAntagonistRollData(data) {
    if (this.type !== 'antagonist') return;
    if (data.base.essence) {
      data.essence = data.base.essence.value ?? 0;
    }
    //Nothing here yet. 


    // Process additional NPC data here.
  }

}