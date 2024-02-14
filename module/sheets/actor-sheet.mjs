import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DemakeActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["ExDemake", "sheet", "actor"],
      template: "systems/exDemake/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/ExDemake/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'antagonist') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    //for (let [k, v] of Object.entries(context.system.abilities)) {
    //  v.label = game.i18n.localize(CONFIG.DEMAKE.abilities[k]) ?? k;
    //}
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // WoD Rolls
    html.find('.promptedroll').click(this.__promptedRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {

      //This line grabs any relevant data from the sheet. 
      let roll = new Roll(dataset.roll, this.actor.getRollData());

      //This puts the text in. 
      let label = dataset.label ? `Rolling ${dataset.label}` : '';
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
  /**
   * Handle WoD rolls, with a dialog suggesting difficulty.
   * @param {Event} event 
   */

  __promptedRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    //Stealing this part. HAndles item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {

      //This line grabs any relevant data from the sheet. 
      let roll = new Roll(dataset.roll, this.actor.getRollData());

      //This puts the text in. 
      let label = dataset.label ? `Rolling ${dataset.label}` : '';
      const allDice = [];
      let rolledDice = 0;

      //These two need to be set up. 
      //console.log("The Roll");
      //console.log(roll);
      let totalDice = roll.formula;
      let difficulty = 6;
      /**Use these to debuf it toalDice is not working.
       console.log("Total Dice value:");
       console.log(totalDice); */
      //let totalSuccs = 0;
      //let result = "";
      const results = this.worldOfDarknessRolls(totalDice, difficulty, roll);
      console.log("Results:");
      console.log(results);

      /**
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      }); 
      * This is the part that I need to replace. 
      */

      return roll;
    }

  }
  /**
   * 
   * @param {*} totalDice 
   * @param {*} difficulty 
   */
  async worldOfDarknessRolls(totalDice, difficulty, roll) {
    
    const allDice = [];
    let success = 0;
    let rollResult = "";
    let rolledDice = 0;
    let rollInfo = "";

    while (totalDice > rolledDice) {
      let roll = await new Roll("1d10");
      roll.evaluate({ async: true });
      allDice.push(roll);

      roll.terms[0].results.forEach((dice) => {
        rolledDice += 1;
        /** This to debug if dice are BEING rolled.
        console.log("A dice was rolled")
        console.log(dice.result);*/
        if (dice.result == 10) {
          success += 1;
        }
        else if (dice.result >= difficulty) {
          success += 1;
        }
        else if (dice.result == 1) {
          success--;
        }

      }); //End of for loop.

    } //End of while loop.
    if (success == 0) {
      rollResult = "fail";
    }
    else if (success <= 0) {
      rollResult = "botch";
    }
    else {
      rollResult = "success";
    }
    /**
    console.log("Roll Result is:");
    console.log(rollResult);
    console.log("Total Successes:");
    console.log(success);*/
    console.log(allDice);
    //This may not work yet.

    const templateData = {
      data: 
      {
        actor: roll.actor,
        type: roll.origin,
        action: roll.action,
        title: rollInfo,
        info: "",
        multipleResult: []
      }
    };
    const template = 'systems/exdemake/templates/actor/roll-template.html';
    const html = await renderTemplate(template, templateData);
    
    const chatData = {
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: allDice,
      content: html,
      speaker: ChatMessage.getSpeaker(),
      rollMode: game.settings.get("core", "rollMode")
    };
    
    ChatMessage.applyRollMode(chatData, "roll");
    ChatMessage.create(chatData);
    

    //Skip all of this and simply post the roll FROM HERE.
    const objres = { success: success, rollResult: rollResult };
    return objres;

  }

}
