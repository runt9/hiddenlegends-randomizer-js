var $HlXpCalc = $HlXpCalc || {};

$HlXpCalc = {
    settings: proboards.plugin.get('hiddenlegends_xp_calc').settings,
    images: proboards.plugin.get('hiddenlegends_xp_calc').images,
    currentCharacter: null,
    jsonEditor: null,
    initialEmptyCharacter: {
        name: "CHARACTER NAME HERE",
        postBonusXp: 0,
        npcEncounterCounter: 0,
        wildEncounterCounter: 0,
        itemCounters: [
            {
                name: "ITEM NAME GOES HERE",
                current: 0,
                limit: 20
            }
        ],
        pokemon: [
            {
                name: "NAME OF STARTER POKEMON",
                level: 5,
                inParty: true,
                canGainXp: true,
                postBonusXp: 0,
                currentXp: 0,
                xpToLevel: 15,
            }
        ]
    },
    
    initProfile: function() {
        var route = pb.data('route');
        var routeName = route.name;
        
        if (routeName === 'user' || routeName === 'current_user') {
            var profileUser = pb.data('page').member;
            var currentUser = pb.data('user');

            if (profileUser.id === currentUser.id || currentUser.is_staff === 1) {
                $HlXpCalc.addCharacterTab(profileUser);
            }
        }
    },

    characterData: function(userId) {
        var characters = pb.plugin.key('characters');
        if (userId !== undefined) {
            return characters.get(userId);
        }

        return characters;
    },

    addCharacterTab: function (user) {
        var url = `/user/${user.id}/characters`;
        var path = document.location.pathname;
        var isActiveTab = url === path;

        var newTab = document.createElement('li');
        newTab.innerHTML = `<a href="${url}" class="${isActiveTab ? 'ui-active' : ''}">Characters</a>`;
        document.querySelector('div.ui-tabMenu > ul.ui-helper-clearfix').append(newTab);

        if (isActiveTab) {
            var charactersJson = $HlXpCalc.characterData(user.id);
            var characters = charactersJson ? charactersJson : [];
            var characterRows = '';
            for (var i in characters) {
                var char = characters[i];
                var name = char['name'];
                characterRows += `
                    <tr>
                        <td>${name}</td>
                        <td><button onclick="$HlXpCalc.characterDialog(${user.id}, '${name}')">Edit Character</button></td>
                    </tr>`;
            }
            var tabContent = `
                <div>
                    Characters:
                    <table class="profile-character-list">
                        <thead>
                        <tr>
                            <th>Character Name</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        ${characterRows}
                        </tbody>
                    </table>
                </div>
                <button onclick="$HlXpCalc.characterDialog(${user.id})">Add Character</button>
            `;

            var container = document.querySelector('div.content > div.ui-helper-clearfix');
            container.innerHTML = tabContent;
        }
    },

    characterDialog: function (userId, existingName) {
        $HlXpCalc.jsonEditor = null;
        var initialJson = {};

        if (existingName !== undefined) {
            var characterData = $HlXpCalc.characterData(userId) || [];
            var character = characterData.find(c => c.name === existingName);
            if (character) {
                initialJson = character;
            }
        } else {
            initialJson = JSON.parse(JSON.stringify($HlXpCalc.initialEmptyCharacter))
        }

        pb.window.dialog('hl-character-dialog', {
            title: 'Add/Edit Character',
            // html: `<div style="height: 100%; width: 100%"><textarea id="character-data" style="height: 100%; width: 100%">${existingData}</textarea></div>`,
            html: `<div style="height: 100%; width: 100%" id="character-json-editor"></div>`,
            modal: true,
            resizable: false,
            height: $(window).height() * 0.9,
            width: $(window).width() * 0.9,
            buttons: [
                {
                    text: 'Close',
                    click: function () {
                        $(this).dialog('close');
                    }
                },
                {
                    text: 'Save',
                    click: function() {
                        var self = $(this);
                        $HlXpCalc.saveCharacter(userId, existingName, function() {
                            self.dialog('close');
                        });
                    }
                }
            ]
        });

        var jsonEditorOptions = {
            search: false,
            mode: 'code',
            enableSort: false,
            enableTransform: false,
            schema: {
                type: 'object',
                properties: {
                    name: {
                        description: 'Name of your character',
                        type: 'string'
                    },
                    postBonusXp: {
                        description: 'Bonus XP given with each post (on top of the default). Usually gained through items. Default 0',
                        type: 'integer',
                        minimum: 0,
                        maximum: 2
                    },
                    wildEncounterCounter: {
                        description: 'Post counter towards next Wild Encounter. Should be 0 for new characters or not changed for existing characters.',
                        type: 'integer',
                        minimum: 0
                    },
                    npcEncounterCounter: {
                        description: 'Post counter towards next NPC Encounter. Should be 0 for new characters or not changed for existing characters.',
                        type: 'integer',
                        minimum: 0
                    },
                    itemCounters: {
                        description: 'Counters towards new items. Current cannot exceed limit',
                        type: 'array',
                        minItems: 0,
                        maxItems: 2,
                        items: { "$ref": "#/$defs/itemCounter" }
                    },
                    pokemon: {
                        description: 'All Pokemon your character has',
                        type: 'array',
                        minItems: 1,
                        items: { "$ref": "#/$defs/pokemon" }
                    }
                },
                required: ['name', 'postBonusXp', 'wildEncounterCounter', 'npcEncounterCounter', 'itemCounters'],
                "$defs": {
                    itemCounter: {
                        type: 'object',
                        properties: {
                            name: {
                                description: 'Name of the item',
                                type: 'string'
                            },
                            current: {
                                description: 'Current post count towards item',
                                type: 'integer',
                                minimum: 0
                            },
                            limit: {
                                description: 'Number of posts required to acquire item',
                                type: 'integer',
                                minimum: 0
                            }
                        },
                        required: ['name', 'current', 'limit']
                    },
                    pokemon: {
                        type: 'object',
                        properties: {
                            name: {
                                description: 'Name of the Pokemon',
                                type: 'string'
                            },
                            inParty: {
                                description: 'Whether or not the Pokemon is in your party and gaining XP',
                                type: 'boolean'
                            },
                            level: {
                                description: 'Current level of the Pokemon. Should not be changed manually.',
                                type: 'integer',
                                minimum: 1,
                                maximum: 100
                            },
                            currentXp: {
                                description: 'Current XP towards next level',
                                type: 'integer',
                                minimum: 0
                            },
                            xpToLevel: {
                                description: 'Amount of XP this Pokemon must gain in order to gain a level',
                                type: 'integer',
                                minimum: 15
                            },
                            postBonusXp: {
                                description: 'How much bonus XP does this Pokemon gain per post. Usually increased by hold items.',
                                type: 'integer',
                                minimum: 0,
                                maximum: 4
                            },
                            canGainXp: {
                                description: 'Whether or not this Pokemon gains XP on posts',
                                type: 'boolean'
                            }
                        },
                        required: ['name', 'inParty', 'level', 'currentXp', 'xpToLevel', 'postBonusXp', 'canGainXp']
                    }
                }
            },
            onValidate: function(data) {
                var errors = [];
                if (data.hasOwnProperty('itemCounters')) {
                    var items = data['itemCounters'];
                    if (Array.isArray(items)) {
                        for (var i in items) {
                            var item = items[i];
                            if (item.hasOwnProperty('current') && item.hasOwnProperty('limit') && item['current'] > item['limit']) {
                                errors.push({
                                    path: ['itemCounters', i, 'current'],
                                    message: 'Current cannot be higher than limit'
                                })
                            }
                        }
                    }
                }

                if (data.hasOwnProperty('pokemon')) {
                    var allPokemon = data['pokemon'];
                    if (Array.isArray(allPokemon)) {
                        var inPartyCount = 0;
                        for (var j in allPokemon) {
                            var pokemon = allPokemon[j];
                            if (pokemon.hasOwnProperty('inParty') && pokemon['inParty'] === true) {
                                inPartyCount++;
                                if (inPartyCount > 6) {
                                    errors.push({
                                        path: ['pokemon'],
                                        message: 'Cannot have more than 6 Pokemon in party'
                                    })
                                }
                            }
                        }
                    }
                }

                return errors;
            }
        };
        $HlXpCalc.jsonEditor = new JSONEditor(document.getElementById('character-json-editor'), jsonEditorOptions, initialJson);
    },

    saveCharacter: function (userId, existingName, callback) {
        $HlXpCalc.jsonEditor.validate().then(function (result) {
            if (result.length > 0) {
                return;
            }

            var characterData = $HlXpCalc.jsonEditor.get();
            var existingCharacterData = $HlXpCalc.characterData(userId);
            var newValue;
            if (existingCharacterData) {
                if (existingName) {
                    for (var i in existingCharacterData) {
                        var char = existingCharacterData[i];
                        if (char['name'] === existingName) {
                            existingCharacterData[i] = characterData;
                        }
                    }
                } else {
                    existingCharacterData.push(characterData);
                }
                newValue = existingCharacterData;
            } else {
                newValue = [characterData];
            }

            $HlXpCalc.characterData().set({
                object_id: userId,
                value: newValue
            });

            $HlXpCalc.jsonEditor.destroy();
            $HlXpCalc.jsonEditor = null;

            callback.call();
        });
    },

    initCharacterSelect: function () {
        var characters = $HlXpCalc.characterData().get() || [];
        var selectedCharacter = pb.plugin.key('selectedCharacter').get();

        var characterOptions = '';
        for (var i in characters) {
            var character = characters[i];
            var name = character['name'];
            characterOptions += '<option value="' + name + '" ' + (name === selectedCharacter ? 'selected="selected"' : '') + '>' + name + '</option>'
        }
        characterOptions += '<option value=""' + (!selectedCharacter ? 'selected="selected"' : '') + '>Out of Character</option>'

        var characterSelect = document.createElement('select');
        characterSelect.style = 'float: right; margin-right: 1em; margin-top: 0.2em';
        characterSelect.onchange = function () {
            pb.plugin.key('selectedCharacter').set({
                object_id: $HlXpCalc.getCurrentUserId(),
                value: $(characterSelect).val()
            });
            $HlXpCalc.loadCurrentCharacter();
        };
        characterSelect.innerHTML = characterOptions;

        $(characterSelect).insertAfter($('#navigation-menu > p#welcome'));
    },

    loadCurrentCharacter: function () {
        $HlXpCalc.currentCharacter = null;
        $HlXpCalc.stagedCharacter = null;
        $HlXpCalc.stagedCharacterList = [];

        var characters = $HlXpCalc.characterData().get() || [];
        var selectedCharacter = pb.plugin.key('selectedCharacter').get();

        for (var i in characters) {
            var character = characters[i];
            if (selectedCharacter === character['name']) {
                $HlXpCalc.currentCharacter = character;
                $HlXpCalc.stagedCharacter = $HlXpCalc.recalculateCharacter(character);
                characters[i] = $HlXpCalc.stagedCharacter;
                $HlXpCalc.stagedCharactersList = characters;
            }
        }

        $HlXpCalc.initPostSetting();
    },

    initPostSetting() {
        if (!$HlXpCalc.stagedCharacter) {
            return;
        }

        pb.plugin.key('postCharacterData').set_on('post_quick_reply', $HlXpCalc.stagedCharacter);
        $HlXpCalc.characterData().set_on('post_quick_reply', $HlXpCalc.getCurrentUserId(), $HlXpCalc.stagedCharactersList);
        pb.plugin.key('postCharacterData').set_on('post_new', $HlXpCalc.stagedCharacter);
        $HlXpCalc.characterData().set_on('post_new', $HlXpCalc.getCurrentUserId(), $HlXpCalc.stagedCharactersList);
    },

    recalculateCharacter: function(character) {
        var clonedCharacter = {};
        Object.assign(clonedCharacter, character);
        clonedCharacter.npcEncounterCounter++;
        clonedCharacter.wildEncounterCounter++;
        clonedCharacter.itemCounters.forEach(c => {
            if (c.current < c.limit) {
                c.current++;
            }
        });

        clonedCharacter.pokemon.filter(p => p.inParty && p.canGainXp).forEach(p => {
            var globalXpPerPost = parseInt($HlXpCalc.settings['global_xp_per_post']);
            var totalBonusXp = globalXpPerPost + p.postBonusXp + clonedCharacter.postBonusXp;
            p.currentXp += totalBonusXp;
            if (p.currentXp >= p.xpToLevel) {
                p.level++;
                p.currentXp = p.currentXp - p.xpToLevel;
                p.xpToLevel++;
            }
        });

        return clonedCharacter;
    },

    getCurrentUserId: function () {
        return parseInt(pb.data("user").id,10);
    },

    initMiniProfiles: function () {
        var profiles = $('.mini-profile');
        if (profiles.length === 0) {
            return;
        }

        var dataKey = pb.plugin.key('postCharacterData');
        profiles.each(function() {
            var post = $(this);
            var postId = post.parents('tr.post').attr('id').split('-')[1];
            var postData = dataKey.get(postId);

            if (!postData) {
                return;
            }

            var dataHtml = `
                <div class="post-character-information">
                    Character: ${postData.name}
                    <ul>
                        <li>NPC Counter: ${postData.npcEncounterCounter}</li>
                        <li>Wild Counter: ${postData.wildEncounterCounter}</li>
                    </ul>
                    Items:
                    <ul>
                        ${postData.itemCounters.map(item => `<li>- ${item.name}: ${item.current} / ${item.limit}</li>`).join('')}
                    </ul>
                    Party Pokemon:
                    <ul>
                        ${postData.pokemon.filter(p => p.inParty).map(p => `<li>- ${p.name}: Level ${p.level} (XP: ${p.currentXp} / ${p.xpToLevel})</li>`).join('')}
                    </ul>
                </div>`;

            $(post.find('div.info')).append($(dataHtml));
        });
    },

    init: function () {
        $HlXpCalc.initProfile();
        $HlXpCalc.initCharacterSelect();
        $HlXpCalc.loadCurrentCharacter();
        $HlXpCalc.initMiniProfiles();
    }
};

// var schema = {
//     name: 'character-name',
//     postBonusXp: 0,
//     wildEncounterCounter: 0,
//     npcEncounterCounter: 0,
//     itemCounters: [
//         {name: 'item-name-1', current: 0, limit: 10},
//         {name: 'item-name-2', current: 0, limit: 20},
//     ],
//     pokemon: [
//         {name: 'name', level: 10, currentXp: 0, xpToLevel: 15, postBonusXp: 0, inParty: true}
//     ]
// }
