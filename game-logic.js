const COLORS = {
  brown:'#8b5a2b', lightblue:'#aae0fa', pink:'#d63384',
  orange:'#fd7e14', red:'#dc3545', yellow:'#ffc107',
  green:'#28a745', darkblue:'#1a3fa0'
};

const SPACES = [
  {name:'GO', type:'go'},
  {name:'Mediterranean Ave', num:1, type:'property', price:60, color:'brown', houseCost:50, rent:[2,10,30,90,160,250]},
  {name:'Community Chest', type:'chest'},
  {name:'Baltic Ave', num:2, type:'property', price:60, color:'brown', houseCost:50, rent:[4,20,60,180,320,450]},
  {name:'Income Tax', type:'tax', amount:200},
  {name:'Reading Railroad', num:3, type:'railroad', price:200, houseCost:100},
  {name:'Oriental Ave', num:4, type:'property', price:100, color:'lightblue', houseCost:50, rent:[6,30,90,270,400,550]},
  {name:'Chance', type:'chance'},
  {name:'Vermont Ave', num:5, type:'property', price:100, color:'lightblue', houseCost:50, rent:[6,30,90,270,400,550]},
  {name:'Connecticut Ave', num:6, type:'property', price:120, color:'lightblue', houseCost:50, rent:[8,40,100,300,450,600]},
  {name:'Jail', type:'jail'},
  {name:'St. Charles Pl', num:7, type:'property', price:140, color:'pink', houseCost:100, rent:[10,50,150,450,625,750]},
  {name:'Electric Company', num:8, type:'utility', price:150, houseCost:50},
  {name:'States Ave', num:9, type:'property', price:140, color:'pink', houseCost:100, rent:[10,50,150,450,625,750]},
  {name:'Virginia Ave', num:10, type:'property', price:160, color:'pink', houseCost:100, rent:[12,60,180,500,700,900]},
  {name:'Pennsylvania RR', num:11, type:'railroad', price:200, houseCost:100},
  {name:'St. James Pl', num:12, type:'property', price:180, color:'orange', houseCost:100, rent:[14,70,200,550,750,950]},
  {name:'Community Chest', type:'chest'},
  {name:'Tennessee Ave', num:13, type:'property', price:180, color:'orange', houseCost:100, rent:[14,70,200,550,750,950]},
  {name:'New York Ave', num:14, type:'property', price:200, color:'orange', houseCost:100, rent:[16,80,220,600,800,1000]},
  {name:'Free Parking', type:'free'},
  {name:'Kentucky Ave', num:15, type:'property', price:220, color:'red', houseCost:150, rent:[18,90,250,700,875,1050]},
  {name:'Chance', type:'chance'},
  {name:'Indiana Ave', num:16, type:'property', price:220, color:'red', houseCost:150, rent:[18,90,250,700,875,1050]},
  {name:'Illinois Ave', num:17, type:'property', price:240, color:'red', houseCost:150, rent:[20,100,300,750,925,1100]},
  {name:'B&O Railroad', num:18, type:'railroad', price:200, houseCost:100},
  {name:'Atlantic Ave', num:19, type:'property', price:260, color:'yellow', houseCost:150, rent:[22,110,330,800,975,1150]},
  {name:'Ventnor Ave', num:20, type:'property', price:260, color:'yellow', houseCost:150, rent:[22,110,330,800,975,1150]},
  {name:'Water Works', num:21, type:'utility', price:150, houseCost:50},
  {name:'Marvin Gardens', num:22, type:'property', price:280, color:'yellow', houseCost:150, rent:[24,120,360,850,1025,1200]},
  {name:'Go To Jail', type:'gotojail'},
  {name:'Pacific Ave', num:23, type:'property', price:300, color:'green', houseCost:200, rent:[26,130,390,900,1100,1275]},
  {name:'North Carolina Ave', num:24, type:'property', price:300, color:'green', houseCost:200, rent:[26,130,390,900,1100,1275]},
  {name:'Community Chest', type:'chest'},
  {name:'Pennsylvania Ave', num:25, type:'property', price:320, color:'green', houseCost:200, rent:[28,150,450,1000,1200,1400]},
  {name:'Short Line', num:26, type:'railroad', price:200, houseCost:100},
  {name:'Chance', type:'chance'},
  {name:'Park Place', num:27, type:'property', price:350, color:'darkblue', houseCost:200, rent:[35,175,500,1100,1300,1500]},
  {name:'Luxury Tax', type:'tax', amount:100},
  {name:'Boardwalk', num:28, type:'property', price:400, color:'darkblue', houseCost:200, rent:[50,200,600,1400,1700,2000]},
];

const RAILROAD_RENT = [25,50,100,200]; // rent for owning 1,2,3,4 railroads

function rentFor(space, houses){
  const level = houses || 0;
  if(level <= 4) return space.rent[level];
  // Builder/Vampire can push a level past the normal Hotel cap of 5 — each
  // full multiple of 5 counts as another Hotel's worth of rent stacked on top.
  const hotels = Math.floor(level/5);
  const extra = level % 5;
  return hotels * space.rent[5] + (extra > 0 ? space.rent[extra] : 0);
}

// Describes a raw house level (which can now run past 5) the way a player
// would actually read it — "2 Hotels + 1 house" instead of "level 11".
function houseLevelLabel(level){
  if(!level || level <= 0) return 'no houses';
  if(level < 5) return level+' house'+(level>1?'s':'');
  const hotels = Math.floor(level/5);
  const extra = level % 5;
  let label = hotels+' Hotel'+(hotels>1?'s':'');
  if(extra > 0) label += ' + '+extra+' house'+(extra>1?'s':'');
  return label;
}

// If either property involved has houses on it, they're liquidated at the
// normal sell-refund rate rather than carried across — the refund goes to
// whoever owned them a moment ago, not the new owner.
function liquidateHousesBeforeTransfer(owner, pos){
  const level = owner.houses[pos] || 0;
  if(level <= 0) return;
  const refund = Math.floor(SPACES[pos].houseCost/2) * level;
  owner.money += refund;
  owner.houses[pos] = 0;
  log(houseLevelLabel(level)+' on '+SPACES[pos].name+' '+(level>1?'are':'is')+' sold off in the exchange — '+owner.name+' collects $'+refund+'.');
}

// Standard Monopoly rule: owning the full color set doubles the base rent
// as long as no houses have been built on it yet. Once a house goes up,
// the normal house-tier rent takes over instead.
function effectivePropertyRent(owner, pos, space){
  const houses = owner.houses[pos] || 0;
  let rent = rentFor(space, houses);
  if(houses === 0 && ownsFullColorGroup(owner, pos)){
    rent *= 2;
  }
  return rent;
}

function colorGroupPositions(color){
  const positions = [];
  SPACES.forEach((s,i)=>{ if(s.type==='property' && s.color===color) positions.push(i); });
  return positions;
}

function ownsFullColorGroup(player, position){
  const space = SPACES[position];
  const group = colorGroupPositions(space.color);
  return group.every(pos => player.owned.includes(pos));
}

function groupMinLevel(player, color){
  const group = colorGroupPositions(color);
  return Math.min(...group.map(pos => player.houses[pos] || 0));
}

// Whether the player currently owns at least one complete color set. Used
// to gate Builder — it's unusable until you have a monopoly to build on.
function playerHasMonopoly(player){
  const colors = new Set(SPACES.filter(s=>s.type==='property').map(s=>s.color));
  for(const color of colors){
    const group = colorGroupPositions(color);
    if(group.every(pos => player.owned.includes(pos))) return true;
  }
  return false;
}

// Builder ability: normal building can go up to 2 Hotels (level 10) instead
// of the usual 1-Hotel (level 5) cap, on any monopoly including railroads/
// utilities.
function maxBuildLevelFor(player){
  return (player && hasAbility(player,'builder')) ? 10 : 5;
}

// Builder ability: completing any monopoly (a color set, all 4 railroads,
// or both utilities) instantly grants free houses on every property in it —
// 2 free each if that group's houseCost is $50-$100, 1 free each if
// $150-$200. Idempotent per group via builderBonusGranted, so it's safe to
// call after every possible way a player can come to own a property.
function checkBuilderBonus(player){
  if(!player || !hasAbility(player,'builder')) return;
  if(!player.builderBonusGranted) player.builderBonusGranted = {};

  const colors = new Set(SPACES.filter(s=>s.type==='property').map(s=>s.color));
  colors.forEach(color=>{
    if(player.builderBonusGranted[color]) return;
    const group = colorGroupPositions(color);
    if(!group.every(pos => player.owned.includes(pos))) return;
    const bonus = SPACES[group[0]].houseCost <= 100 ? 2 : 1;
    group.forEach(pos=>{ player.houses[pos] = (player.houses[pos]||0) + bonus; });
    player.builderBonusGranted[color] = true;
    log(player.name+"'s Builder ability grants "+bonus+' free house'+(bonus>1?'s':'')+' on each '+color+' property for completing the set!');
  });

  [
    {key:'railroad', group: RAILROAD_POSITIONS, houseCost: 100},
    {key:'utility', group: UTILITY_POSITIONS, houseCost: 50},
  ].forEach(({key, group, houseCost})=>{
    if(player.builderBonusGranted[key]) return;
    if(!group.every(pos => player.owned.includes(pos))) return;
    const bonus = houseCost <= 100 ? 2 : 1;
    group.forEach(pos=>{ player.houses[pos] = (player.houses[pos]||0) + bonus; });
    player.builderBonusGranted[key] = true;
    log(player.name+"'s Builder ability grants "+bonus+' free house'+(bonus>1?'s':'')+' on each '+key+' for completing the set!');
  });
}

// Positions the player could steal (from the bank or another player) that
// would complete a color set they're one property short on. Housed
// properties are still fair game — any houses involved get liquidated on
// transfer (see liquidateHousesBeforeTransfer), so there's no gap left for
// them to fall through.
function findTheftTargets(player){
  const targets = [];
  const colorsSeen = new Set();
  SPACES.forEach(s=>{
    if(s.type !== 'property' || colorsSeen.has(s.color)) return;
    colorsSeen.add(s.color);
    const group = colorGroupPositions(s.color);
    const ownedInGroup = group.filter(pos => player.owned.includes(pos));
    if(ownedInGroup.length === group.length - 1){
      const missing = group.find(pos => !player.owned.includes(pos));
      const owner = findOwner(missing);
      if(!owner || owner.id !== player.id){
        targets.push(missing);
      }
    }
  });
  return targets;
}

const CARD_DEFS = [
  {
    id:'theprojects', num:1, name:'The Projects', type:'teleport', image: 'cards/1-theprojects.png',
    desc:'Warp to Baltic or Mediterranean. Unowned: half price. Owned: pay half rent. Requires having reached Free Parking.',
    destinations:[1,3]
  },
  {
    id:'blues', num:2, name:'Blues', type:'teleport', image: 'cards/2-blues.png',
    desc:'Warp to Oriental, Vermont, or Connecticut. Unowned: half price. Owned: pay half rent. Requires having reached Free Parking.',
    destinations:[6,8,9]
  },
  {
    id:'pinks', num:3, name:'Pinks', type:'teleport', image: 'cards/3-pinks.png',
    desc:'Warp to St. Charles, States, or Virginia. Unowned: half price. Owned: pay half rent. Requires having reached Free Parking.',
    destinations:[11,13,14]
  },
  {
    id:'oranges', num:4, name:'Oranges', type:'teleport', image: 'cards/4-oranges.png',
    desc:'Warp to St. James, Tennessee, or New York. Unowned: half price. Owned: pay half rent. Requires having reached Free Parking.',
    destinations:[16,18,19]
  },
  {
    id:'greens', num:5, name:'Greens', type:'teleport', image: 'cards/5-greens.png',
    desc:'Warp to Pacific, North Carolina, or Pennsylvania. Unowned: half price. Owned: pay half rent. Requires having reached Free Parking.',
    destinations:[31,32,34]
  },
  {
    id:'yellows', num:6, name:'Yellows', type:'teleport', image: 'cards/6-yellows.png',
    desc:'Warp to Atlantic, Ventnor, or Marvin Gardens. Unowned: half price. Owned: pay half rent. Requires having reached Free Parking.',
    destinations:[26,27,29]
  },
  {
    id:'darkblues', num:7, name:'Dark Blues', type:'teleport', image: 'cards/7-darkblues.png',
    desc:'Warp to Boardwalk or Park Place. Unowned: half price. Owned: pay half rent. Mortgaged: steal it for double board price. Requires having reached Free Parking.',
    destinations:[37,39]
  },
  {
    id:'railroads', num:8, name:'Railroads', type:'teleport', image: 'cards/8-railroads.png',
    desc:'Warp to any Railroad (Reading, Pennsylvania, B&O, or Short Line). Unowned: half price. Owned: pay half rent. Mortgaged: steal it for double board price. Requires having reached Free Parking.',
    destinations:[5,15,25,35]
  },
  {
    id:'taxation', num:9, name:'Taxation', type:'taxation', image: 'cards/9-taxation.png',
    desc:'Give to a player (or yourself) — they must go to either Income Tax or Luxury Tax. Requires having reached Free Parking.',
    destinations:[4,38]
  },
  {
    id:'speedflips', num:10, name:'Speed Flips', type:'coinbonus', image: 'cards/10-speedflips.png',
    desc:'Flip 3 coins. For each heads you may add +5 to your roll — you choose how many to actually use.'
  },
  {
    id:'gamblerscurse', num:11, name:"Gambler's Curse", type:'coincurse', image: 'cards/11-gamblerscurse.png',
    desc:'Flip 3 coins. 3 heads: win $1000. 3 tails: lose $500, split among the other players however you choose.'
  },
  {
    id:'smallmoves', num:12, name:'Small Moves', type:'smallmoves', image: 'cards/12-smallmoves.png',
    desc:'Flip a coin. Heads: you may move 1 space forward after your roll. Tails: 1 space backward. Using it is optional.'
  },
  {
    id:'roll', num:13, name:'Roll', type:'rollboost', image: 'cards/13-roll.png', value:3,
    desc:'+3 to your next roll. Give it to yourself or another player.'
  },
  {
    id:'rollplus', num:14, name:'Roll+', type:'rollboost', image: 'cards/14-rollplus.png', value:5,
    desc:'+5 to your next roll. Give it to yourself or another player.'
  },
  {
    id:'rollplusplus', num:15, name:'Roll++', type:'rollboost', image: 'cards/15-rollplusplus.png', value:7,
    desc:'+7 to your next roll. Give it to yourself or another player.'
  },
  {
    id:'rollplusplusplus', num:16, name:'Roll+++', type:'rollboost', image: 'cards/16-rollplusplusplus.png', value:10,
    desc:'+10 to your next roll. Give it to yourself or another player.'
  },
  {
    id:'pickup', num:17, name:'Pickup', type:'pickup', image: 'cards/17-pickup.png',
    desc:'On your next roll, get a card for every Chance/Community Chest space you pass over.'
  },
  {
    id:'coinflipsteal', num:18, name:'Coin Flip Steal', type:'coinsteal', image: 'cards/18-coinflipsteal.png',
    desc:'Flip a coin for each unmortgaged property you own. For every heads, collect $50 from each other player (players in jail are exempt).'
  },
  {
    id:'propertytheft', num:19, name:'Property Theft', type:'propertytheft', image: 'cards/19-propertytheft.png',
    desc:"If you're one property short of a monopoly, steal that property from the bank or another player — you must give back one of your own properties in return."
  },
  {
    id:'custom', num:20, name:'Custom', type:'custom', image: 'cards/20-custom.png',
    desc:'Flip 2 coins. Each heads lets you choose that die\'s value (1-6) on your next roll; unchosen dice roll normally.'
  },
  {
    id:'slow', num:21, name:'Slow', type:'rollboost', image: 'cards/21-slow.png', value:-5,
    desc:'-5 to your next roll. Give it to yourself or another player.'
  },
  {
    id:'slowplus', num:22, name:'Slow+', type:'rollboost', image: 'cards/22-slowplus.png', value:-7,
    desc:'-7 to your next roll. Give it to yourself or another player.'
  },
  {
    id:'slowplusplus', num:23, name:'Slow++', type:'rollboost', image: 'cards/23-slowplusplus.png', value:-10,
    desc:'-10 to your next roll. Give it to yourself or another player.'
  },
  {
    id:'slowflips', num:24, name:'Slow Flips', type:'slowflips', image: 'cards/24-slowflips.png',
    desc:'Flip 4 coins. The target loses 5 to their next roll for every tails. Give it to yourself or another player.'
  },
  {
    id:'switchrandom', num:25, name:'Switch Random', type:'switchrandom', image: 'cards/25-switchrandom.png',
    desc:'Randomly swap yourself with another player. Swapping places does not mean you land on the space you swap to.'
  },
  {
    id:'skip', num:26, name:'Skip', type:'skip', image: 'cards/26-skip.png',
    desc:"Give to a player (or yourself) — they skip the roll on their next turn, but can still use cards, trade, and buy houses that turn."
  },
  {
    id:'switch', num:27, name:'Switch', type:'switch', image: 'cards/27-switch.png',
    desc:'Swap yourself with one other player of your choice. Swapping places does not mean you land on the space you swap to.'
  },
  {
    id:'switchany', num:28, name:'Switch Any', type:'switchany', image: 'cards/28-switchany.png',
    desc:'Choose 2 players (can include yourself) to swap places with each other. Swapping places does not mean you land on the space swapped to.'
  },
  {
    id:'pickupchance', num:29, name:'Pickup Chance', type:'pickupchance', image: 'cards/29-pickupchance.png',
    desc:'Draw 3 Chance cards, one at a time.'
  },
  {
    id:'pickupboth', num:30, name:'Pickup Both', type:'pickupboth', image: 'cards/30-pickupboth.png',
    desc:'Draw 2 Chance cards, then 2 Community Chest cards, one at a time.'
  },
  {
    id:'drawcards', num:31, name:'Draw Cards', type:'drawcards', image: 'cards/31-drawcards.png',
    desc:'Draw 2 cards.'
  },
  {
    id:'pickupcommunitychest', num:32, name:'Pickup Community Chest', type:'pickupcommunitychest', image: 'cards/32-pickupcommunitychest.png',
    desc:'Draw 3 Community Chest cards, one at a time.'
  },
  {
    id:'flipdraw', num:33, name:'Flip Draw', type:'flipdraw', image: 'cards/33-flipdraw.png',
    desc:'Flip 3 coins and draw a card for each heads flipped.'
  },
  {
    id:'buyer', num:34, name:'Buyer', type:'buyer', image: 'cards/34-buyer.png',
    desc:'Teleport to the next unowned property. Usable even before reaching Free Parking.'
  },
  {
    id:'lottery', num:35, name:'Lottery', type:'lottery', image: 'cards/35-lottery.png',
    desc:'Flip 2 coins. 2 heads: go anywhere (choosing GO instead gives you $400). 1 heads: go anywhere except GO or Free Parking. 0 heads: send one other player to Free Parking. Requires having reached Free Parking.',
  },
  {
    id:'demolisher', num:36, name:'Demolisher', type:'demolisher', image: 'cards/36-demolisher.png',
    desc:"Flip 3 coins. For each heads, knock one house off a random opposing property (a Hotel drops to 4 houses and counts as one)."
  },
  {
    id:'freelo', num:37, name:'Freelo', type:'freelo', image: 'cards/37-freelo.png',
    desc:'The next property you land on is free to buy if unowned, or rent-free if owned.'
  },
  {
    id:'builder', num:38, name:'Builder', type:'builder', image: 'cards/38-builder.png',
    desc:'Flip 4 coins. For each heads, build a house on a property in a full color set you own (even-building still applies; upgrading to a Hotel counts as one house). Unusable until you own at least one monopoly.'
  },
  {
    id:'wrongway', num:39, name:'Wrong Way', type:'wrongway', image: 'cards/39-wrongway.png',
    desc:'Give to yourself or another player — they move backwards on their next roll. Passing a property backwards works just like passing it forwards, except passing GO backwards gives no money or card (landing exactly on GO still does).'
  },
  {
    id:'diced', num:40, name:'Diced', type:'diced', image: 'cards/40-diced.png',
    desc:'Choose to roll 1 die or 3 dice on your next roll.'
  },
  {
    id:'curseddie', num:41, name:'Cursed Die', type:'curseddie', image: 'cards/41-curseddie.png',
    desc:'Give to yourself or another player — they can only roll one die on their next turn.'
  },
  {
    id:'goanywhere', num:42, name:'Go Anywhere', type:'goanywhere', image: 'cards/42-goanywhere.png',
    desc:'Go anywhere on the board. Choosing GO instead gives you $400 (and still draws your card for landing on GO). Requires having reached Free Parking.'
  },
  {
    id:'driveby', num:43, name:'Drive By', type:'driveby', image: 'cards/43-driveby.png', value:100,
    desc:'Steal $100 from every player you pass this turn (starting or ending on their space counts as passing them). Players in jail are exempt. Only in effect for this roll — a doubles bonus roll does not count.'
  },
  {
    id:'drivebyplus', num:44, name:'Drive By+', type:'driveby', image: 'cards/44-drivebyplus.png', value:200,
    desc:'Steal $200 from every player you pass this turn (starting or ending on their space counts as passing them). Players in jail are exempt. Only in effect for this roll — a doubles bonus roll does not count.'
  },
  {
    id:'drivebyplusplus', num:45, name:'Drive By++', type:'driveby', image: 'cards/45-drivebyplusplus.png', value:300,
    desc:'Steal $300 from every player you pass this turn (starting or ending on their space counts as passing them). Players in jail are exempt. Only in effect for this roll — a doubles bonus roll does not count.'
  },
  {
    id:'passby', num:46, name:'Pass By', type:'passby', image: 'cards/46-passby.png', pct:0.4,
    desc:'Choose a player and a property. The next time that player passes that property, they pay 40% of the rent they would have owed if they\'d landed on it. Teleport cards never count as passing.'
  },
  {
    id:'passbyplus', num:47, name:'Pass By+', type:'passby', image: 'cards/47-passbyplus.png', pct:0.5,
    desc:'Choose a player and a property. The next time that player passes that property, they pay 50% of the rent they would have owed if they\'d landed on it. Teleport cards never count as passing.'
  },
  {
    id:'passbyplusplus', num:48, name:'Pass By++', type:'passby', image: 'cards/48-passbyplusplus.png', pct:0.6,
    desc:'Choose a player and a property. The next time that player passes that property, they pay 60% of the rent they would have owed if they\'d landed on it. Teleport cards never count as passing.'
  },
  {
    id:'jumpinplace', num:49, name:'Jump in Place', type:'jumpinplace', image: 'cards/49-jumpinplace.png',
    desc:'Land on your current space again, as if you jumped in place — re-triggers whatever that space does (Free Parking, Chance, rent, etc.).'
  },
  {
    id:'cardswitch', num:50, name:'Card Switch', type:'cardswitch', image: 'cards/50-cardswitch.png',
    desc:"Choose a player, look through their hand, and swap one of their cards for one of your own."
  },
  {
    id:'gamblingluck', num:51, name:'Gambling Luck', type:'gamblingluck', image: 'cards/51-gamblingluck.png',
    desc:'Playable only right after rolling two 1s, before your next roll — cash in for $1000.'
  },
  {
    id:'knockback', num:52, name:'Knockback', type:'knockback', image: 'cards/52-knockback.png',
    desc:'Every player you pass this turn gets knocked back 1 space, landing on it for real. Starting or ending on their space counts as passing them.'
  },
  {
    id:'knockforward', num:53, name:'Knock Forward', type:'knockforward', image: 'cards/53-knockforward.png',
    desc:'Every player you pass this turn gets pushed forward 1 space, landing on it for real. Starting or ending on their space counts as passing them.'
  },
  {
    id:'jailed', num:54, name:'Jailed', type:'jailed', image: 'cards/54-jailed.png',
    desc:'Send a random player to Jail — including possibly yourself.'
  },
  {
    id:'rowdyguest', num:55, name:'Rowdy Guest', type:'rowdyguest', image: 'cards/55-rowdyguest.png',
    desc:"The next property you land on, if it isn't yours, knocks 3 houses off it (a Hotel drops to 2 houses' worth) before you pay rent — the group is rebalanced to stay even, with no refund."
  },
  {
    id:'unoreverse', num:56, name:'Uno Reverse', type:'unoreverse', image: 'cards/56-unoreverse.png',
    desc:"The next property you land on: if it's someone else's, they pay YOU half the rent instead. If it's your own, you pay half the rent out to the other players, split however you choose."
  },
  {
    id:'extension', num:57, name:'Extension', type:'extension', image: 'cards/57-extension.png',
    desc:"Give to any player — their next non-doubles roll still lets them go again, without counting toward the doubles-streak jail penalty. Pushed back a turn if they roll real doubles instead; voided entirely if they end up in Jail."
  },
  {
    id:'drivebycoin', num:58, name:'Drive By+++', type:'drivebycoin', image: 'cards/58-drivebyplusplusplus.png',
    desc:'Flip 4 coins — steal $100 per heads from every player you pass on your next roll (starting or ending on their space counts as passing them). Only in effect for that roll.'
  },
  {
    id:'jailbreak', num:59, name:'Jail Break', type:'jailbreak', image: 'cards/59-jailbreak.png',
    desc:"Playable only while you're in Jail — breaks everyone out, including you. Every other player freed this way pays you $200."
  },
  {
    id:'rentthief', num:60, name:'Rent Thief', type:'rentthief', image: 'cards/60-rentthief.png',
    desc:"Give to another player — the next time they land on a property/railroad/utility owned by a third player, that rent comes to you instead of the owner. Needs 3+ active players; if it can no longer be used, swap it for a new card instead of playing it."
  },
  {
    id:'hardhitter', num:61, name:'Hard Hitter', type:'hardhitter', image: 'cards/61-hardhitter.png',
    desc:"Give to another player. If their next landing owes rent to anyone (not just you), they pay double. If it doesn't (unowned, their own property, tax, etc.), they simply keep this card in their hand instead."
  },
  {
    id:'flashsale', num:62, name:'Flash Sale', type:'flashsale', image: 'cards/62-flashsale.png',
    desc:'Houses and hotels are half off for the rest of your turn, up to $1000 of full-price value (so up to $500 actually spent). Once that runs out, it\'s back to full price.'
  },
  {
    id:'passbyremix', num:63, name:'Pass By Remix', type:'passbyremix', image: 'cards/63-passbyremix.png',
    desc:"Give to another player. For every one of your properties they pass over (not land on) this upcoming roll, they pay you $100. Works in both directions."
  },
  {
    id:'stunned', num:64, name:'Stunned', type:'stunned', image: 'cards/64-stunned.png',
    desc:"Give to another player — for their entire next turn they can only roll and pay rent. No trading, buying/mortgaging property, building, or playing cards."
  },
  {
    id:'giveaway', num:65, name:'Giveaway', type:'giveaway', image: 'cards/65-giveaway.png',
    desc:'Draw a card for every player still in the game, then hand one to each other player — whatever\'s left over is yours.'
  },
  {
    id:'teleportother', num:66, name:'Teleport Other', type:'teleportother', image: 'cards/66-teleportother.png',
    desc:"Teleport another player anywhere on the board. Doesn't trigger passing-GO money or any landing effect — it's a pure position move."
  },
  {
    id:'averageroll', num:67, name:'Average Roll', type:'averageroll', image: 'cards/67-averageroll.png',
    desc:'Instantly rolls a 3 and a 4 for you (7 total) — this counts as your roll for the turn.'
  },
  {
    id:'conductor', num:68, name:'Conductor', type:'conductor', image: 'cards/68-conductor.png',
    desc:'Your next roll redirects through the railroads: passing over any railroad warps you to one space past the next railroad, then you keep moving with whatever roll you have left.'
  },
  {
    id:'gamblingnight', num:69, name:'Gambling Night', type:'gamblingnight', image: 'cards/69-gamblingnight.png',
    desc:"Flip 3 coins. Every other player pays $100 per heads into a shared pot; roll 3 tails and you alone pay $200 instead. One random player (maybe you) wins the whole pot."
  },
  {
    id:'oneatatime', num:70, name:'One at a Time', type:'oneatatime', image: 'cards/70-oneatatime.png',
    desc:'Give to any player (including yourself) — from now on they roll and move one die at a time, resolving each landing before rolling the next. Doubles/triples still count normally.'
  },
  {
    id:'halfchoosing', num:71, name:'Half Choosing', type:'halfchoosing', image: 'cards/71-halfchoosing.png',
    desc:"Give to another player and choose the value of one of their next roll's dice — the rest roll normally. Locks out Custom until used; Average Roll or skipping the roll can still override it."
  },
  {
    id:'reroll', num:72, name:'ReRoll', type:'reroll', image: 'cards/72-reroll.png',
    desc:'Choose up to 3 of your own cards and/or properties to return (cards to the draw pile, properties to the bank) and instantly replace each with a random one of the same kind.'
  },
];

// Abilities are permanent, one-per-player perks — unlike CARD_DEFS, these
// never get drawn/discarded. Each player is granted exactly one, the first
// time they pass GO (see awardPassingGoWithCard). Art works the same way
// as cards/: drop a PNG named to match `image` into abilities/.
const ABILITY_DEFS = [
  {
    id:'highroller', num:1, name:'High Roller', image:'abilities/1-highroller.png',
    desc:"You permanently roll 3 dice (including to break out of Jail). Any 2 matching counts as doubles — roll again, but you may choose not to. All 3 matching wins $500 and resets your doubles streak. Three doubles in a row in the same turn ends your turn instead of sending you to Jail."
  },
  {
    id:'luckyduck', num:2, name:'Lucky Duck', image:'abilities/2-luckyduck.png', usedImage:'abilities/2-luckyduck-used.png',
    desc:"Every coin flip you make — including ones you use against other players — always comes up in your favor. The first time you'd go bankrupt, you instead revive with $500 (whoever bankrupted you only collects what you actually had). Once per game."
  },
  {
    id:'vampire', num:3, name:'Vampire', image:'abilities/3-vampire.png',
    desc:"Landing on someone else's housed property (after paying rent) steals one house/hotel-level off it — you can drop it on any one of your own properties, even one that's already a Hotel, stacking a 2nd (or 3rd...) Hotel there. This is the only way past one Hotel — everyone (including you) is still capped at a single Hotel through normal building. You also have Squatting: build up to 2 houses on any property, railroad, or utility you own without needing the full set (railroads $100/house, utilities $50/house, rent scales 1.5x/2x/3x...)."
  },
  {
    id:'firstrateduelist', num:4, name:'First Rate Duelist', image:'abilities/4-firstrateduelist.png',
    desc:"Double Draw: landing on Chance or Community Chest draws 2 cards from the deck instead of 1 (the classic Chance/Community Chest space effect itself is unaffected). Large Pockets: your hand holds up to 10 cards instead of 5, and you can play 2 cards per turn instead of 1."
  },
  {
    id:'builder', num:5, name:'Builder', image:'abilities/5-builder.png',
    desc:"Normal building can go up to 2 Hotels (level 10) instead of the usual 1-Hotel cap, on any monopoly — including owning all 4 railroads or both utilities. The moment you complete any monopoly, you're instantly given free houses on every property in it: 2 free each for a $50-$100 house cost (brown, light blue, pink, orange, railroads, utilities), 1 free each for $150-$200 (red, yellow, green, dark blue)."
  },
  {
    id:'greedylandlord', num:6, name:'Greedy Landlord', image:'abilities/6-greedylandlord.png',
    desc:"Rent collected on your properties is never less than $100, and gets a bonus on top: base rent $100-$650 is +50%, $651-$1000 is +35%, $1001+ is +25%. Whatever rent has already been computed by any other effect (Pass By's percentage, half-rent cards, Hard Hitter's double) counts as the base for this. If the payer has Coupon Clipper, this cancels out entirely and they pay the plain unmodified amount."
  },
  {
    id:'couponclipper', num:7, name:'Coupon Clipper', image:'abilities/7-couponclipper.png',
    desc:"Rent you owe is discounted: $100 or less is voided completely, $101-$650 is half, $651-$1000 is 65%, $1001+ is 75%. Whatever rent has already been computed by any other effect (Pass By's percentage, half-rent cards, Hard Hitter's double) counts as the base for this. If the property owner has Greedy Landlord, this cancels out entirely and you pay the plain unmodified amount."
  },
  {
    id:'officer', num:8, name:'Officer', image:'abilities/8-officer.png',
    desc:"You can never be sent to Jail — landing on Go To Jail instead sends a random other player there, and any other Jail-sending effect targeting you just fizzles. Landing on the same space as another player sends THEM to Jail (only when you're the one arriving). Whenever anyone leaves Jail — by rolling doubles or waiting out their 3rd turn — they pay you $100. Income Tax and Luxury Tax are your own properties from the moment you get this ability: everyone else pays you that tax as rent instead of the Free Parking pot (Chance/Community Chest fees still go to the pot as normal)."
  },
];

// ============================================================
// Customizable ruleset — chosen at room-creation time (see server.js's
// joinRoom handler), stored on state.ruleset for the life of the game.
// Every player can now hold more than one ability at once (see
// hasAbility()/player.abilities below), which only matters if
// maxAbilitiesPerPlayer > 1 — the default of 1 reproduces the original
// "exactly one ability, ever" behavior exactly.
// ============================================================
const DEFAULT_RULESET = {
  disabledCardIds: [],        // CARD_DEFS ids excluded from this game's deck
  disabledAbilityIds: [],     // ABILITY_DEFS ids excluded from the grant pool
  abilityMode: 'random',      // 'random' (today's behavior) | 'choice' (offer a few, player picks)
  choiceCount: 2,             // how many options 'choice' mode offers, when the pool has enough
  allowRepeatAbilities: false,// false = no two players ever share an ability (today's behavior)
  maxAbilitiesPerPlayer: 1,   // how many abilities a player accumulates before GO passes just draw cards
  enableDebugTools: false,    // off by default — free money/properties/cards/abilities, everyone in the room gets it if on
};

function normalizeRuleset(ruleset){
  const r = Object.assign({}, DEFAULT_RULESET, ruleset || {});
  r.disabledCardIds = Array.isArray(r.disabledCardIds) ? r.disabledCardIds.filter(id=>typeof id==='string') : [];
  r.disabledAbilityIds = Array.isArray(r.disabledAbilityIds) ? r.disabledAbilityIds.filter(id=>typeof id==='string') : [];
  r.abilityMode = r.abilityMode === 'choice' ? 'choice' : 'random';
  r.allowRepeatAbilities = !!r.allowRepeatAbilities;
  const maxChoice = ABILITY_DEFS.length;
  r.choiceCount = Math.min(Math.max(parseInt(r.choiceCount,10) || 2, 2), maxChoice);
  r.maxAbilitiesPerPlayer = Math.min(Math.max(parseInt(r.maxAbilitiesPerPlayer,10) || 1, 1), maxChoice);
  r.enableDebugTools = !!r.enableDebugTools;
  return r;
}

// player.abilities is an array (was a single `ability` string/null before
// multi-ability rulesets existed) — this is the one place that reads it,
// so every other function just calls hasAbility(player, 'x') instead of
// checking player.ability directly.
function hasAbility(player, id){
  return !!(player && player.abilities && player.abilities.includes(id));
}

const MAX_HAND_SIZE = 5;

function maxHandSize(player){
  return (player && hasAbility(player,'firstrateduelist')) ? 10 : MAX_HAND_SIZE;
}

function maxCardsPerTurn(player){
  return (player && hasAbility(player,'firstrateduelist')) ? 2 : 1;
}

function shuffle(arr){
  for(let i=arr.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

// Draws the top card of the pile, reshuffling the discard pile back in
// if the draw pile has run out. Returns null only if there are truly
// no cards left anywhere (shouldn't happen with a real deck).
// Once the main deck runs dry, it no longer reshuffles from the discard
// pile — instead this permanently (once) flips on Sudden Death, after
// which every further draw here just returns null (silently no-op'd by
// drawCardIfRoom, same as any other missing-card case). Does not affect
// the separate Chance/Community Chest piles (drawChanceOrChestCard),
// which always reshuffle regardless of Sudden Death.
function drawFromPile(){
  if(state.drawPile.length === 0){
    if(!state.suddenDeath){
      state.suddenDeath = true;
      log('💀 The card deck has run out — SUDDEN DEATH begins! Rent and every other player-to-player payment now vanishes into the bank instead of reaching its target.');
      state.players.forEach(p => notify(p, '💀 Sudden Death has begun — payments to other players now vanish instead of arriving.'));
    }
    return null;
  }
  return state.drawPile.pop();
}

// Sudden Death's single choke point: the payer side of any transaction
// always still deducts money as normal, but the *receiving* side goes
// through this — money vanishes instead of arriving once state.suddenDeath
// is true. Every function that moves money from one player to another
// routes through this rather than crediting player.money directly.
// Deliberately NOT used for bank-to-player or self-only payments (dividend
// cards, mortgaging, the triples bonus, a bankruptcy killer's payout,
// acceptTrade's negotiated money exchange) — those aren't "the flow of
// income between players" this rule targets.
function creditPlayer(player, amount, reason){
  if(amount <= 0) return;
  if(state.suddenDeath){
    log('(Sudden Death: the $'+amount+' '+(reason||'payment')+' vanishes into the bank instead of reaching '+player.name+'.)');
    return;
  }
  player.money += amount;
}

const RAILROAD_POSITIONS = [5,15,25,35];

function nearestRailroad(pos){
  for(const r of RAILROAD_POSITIONS){ if(r>pos) return r; }
  return RAILROAD_POSITIONS[0];
}

// Conductor's movement: steps through the roll one space at a time, and
// whenever the CURRENT position (before taking the next single-space
// step) is a railroad, redirects that one step to "one past the next
// railroad after this one" instead of a plain +1 — this is what makes
// starting ON a railroad trigger it immediately (step 1 redirects) and
// passing OVER one trigger it on the very next step after landing there.
// Tracks GO-passing across every transition, plain steps and redirect
// jumps alike, since the jump itself can wrap past GO (e.g. from Short
// Line, the "next" railroad wraps to Reading). Returns whether GO was
// passed at least once, so the caller can award the usual $200+card.
function applyConductorMove(player, fromPos, totalSteps){
  let pos = fromPos;
  let remaining = totalSteps;
  let passedGo = false;
  while(remaining > 0){
    let dest, distance;
    if(SPACES[pos].type === 'railroad'){
      dest = (nearestRailroad(pos) + 1) % 40;
      distance = (dest - pos + 40) % 40;
    } else {
      dest = (pos + 1) % 40;
      distance = 1;
    }
    if(pos + distance >= 40) passedGo = true;
    pos = dest;
    remaining -= 1;
  }
  player.position = pos;
  return passedGo;
}

const UTILITY_POSITIONS = [12,28];

function nearestUtility(pos){
  for(const u of UTILITY_POSITIONS){ if(u>pos) return u; }
  return UTILITY_POSITIONS[0];
}

// Builder ability: whether the player owns every railroad or every
// utility, the non-color-set "monopoly" that unlocks building on them.
function ownsAllOfType(player, type){
  const group = type === 'railroad' ? RAILROAD_POSITIONS : UTILITY_POSITIONS;
  return group.every(pos => player.owned.includes(pos));
}

function groupMinLevelForType(player, type){
  const group = type === 'railroad' ? RAILROAD_POSITIONS : UTILITY_POSITIONS;
  return Math.min(...group.map(pos => player.houses[pos] || 0));
}

// Vampire's Squatting can put houses on railroads/utilities too, which have
// no rent table to index — instead each house scales the base rent: 1
// house is 1.5x, 2 houses is 2x, 3 is 3x, and so on.
function nonPropertyHouseMultiplier(houses){
  const level = houses || 0;
  if(level === 0) return 1;
  if(level === 1) return 1.5;
  return level;
}

// Walks forward from fromPos (wrapping around the board) and returns the
// first unowned property/railroad/utility position, or null if every
// ownable space is already owned. Used by Buyer.
function nearestUnownedProperty(fromPos){
  for(let i=1;i<=40;i++){
    const pos = (fromPos+i)%40;
    const space = SPACES[pos];
    if((space.type==='property' || space.type==='railroad' || space.type==='utility') && !findOwner(pos)){
      return pos;
    }
  }
  return null;
}

// Every currently-unowned property/railroad/utility position. Used for the
// random free-property gift when landing on Free Parking.
function unownedPropertyPositions(){
  const positions = [];
  SPACES.forEach((s,i)=>{
    if((s.type==='property' || s.type==='railroad' || s.type==='utility') && !findOwner(i)) positions.push(i);
  });
  return positions;
}

// Every {player, pos} pair, across all players except excludeId, where a
// house or hotel is currently built. Used by Demolisher.
function findHousedPropertiesOf(players, excludeId){
  const results = [];
  players.forEach(p=>{
    if(p.id === excludeId || p.bankrupt) return;
    p.owned.forEach(pos=>{
      if((p.houses[pos]||0) > 0) results.push({player:p, pos});
    });
  });
  return results;
}

const CHANCE_DECK = [
  {text:'Advance to GO. Collect $200.', apply(p){ advanceTo(p,0); }},
  {text:'Advance to Illinois Avenue. If you pass GO, collect $200.', apply(p){ advanceTo(p,24); }},
  {text:'Advance to St. Charles Place. If you pass GO, collect $200.', apply(p){ advanceTo(p,11); }},
  {text:'Advance to the nearest Utility. If unowned, you may buy it from the Bank.', apply(p){ advanceTo(p, nearestUtility(p.position)); }},
  {text:'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay owner twice the rental.', apply(p){ advanceTo(p, nearestRailroad(p.position)); }},
  {text:'Advance to the nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay owner twice the rental.', apply(p){ advanceTo(p, nearestRailroad(p.position)); }},
  {text:'Bank pays you a dividend of $50.', apply(p){ p.money += 50; }},
  {text:'Get Out of Jail Free. This card is kept until needed.', apply(p){ p.getOutOfJailFree = (p.getOutOfJailFree||0)+1; }},
  {text:'Go back 3 spaces.', apply(p){ moveBy(p,-3); }},
  {text:'Go to Jail. Do not pass GO, do not collect $200.', apply(p){ sendToJail(p); }},
  {text:'Make general repairs on all your property: $25 per house, $100 per hotel. (No effect until houses exist.)', apply(p){ /* TODO: wire up once houses/hotels are implemented */ }},
  {text:'Pay a speeding fine of $15.', apply(p, state){ p.money -= 15; state.freeParkingPot += 15; }},
  {text:'Take a trip to Reading Railroad. If you pass GO, collect $200.', apply(p){ advanceTo(p,5); }},
  {text:'Advance to Boardwalk.', apply(p){ advanceTo(p,39); }},
  {text:'You have been elected Chairman of the Board. Pay each player $50.', apply(p, state){
    state.players.forEach(other=>{
      if(other!==p && !other.bankrupt){ p.money -= 50; creditPlayer(other, 50, 'Chairman of the Board'); }
    });
  }},
  {text:'Your building loan matures. Collect $150.', apply(p){ p.money += 150; }},
];

const CHEST_DECK = [
  {text:'Advance to GO. Collect $200.', apply(p){ advanceTo(p,0); }},
  {text:'Bank error in your favor. Collect $200.', apply(p){ p.money += 200; }},
  {text:"Doctor's fee. Pay $50.", apply(p, state){ p.money -= 50; state.freeParkingPot += 50; }},
  {text:'From sale of stock you get $50.', apply(p){ p.money += 50; }},
  {text:'Get Out of Jail Free. This card is kept until needed.', apply(p){ p.getOutOfJailFree = (p.getOutOfJailFree||0)+1; }},
  {text:'Go to Jail. Do not pass GO, do not collect $200.', apply(p){ sendToJail(p); }},
  {text:'Grand Opera Night. Collect $50 from every player for opening night seats.', apply(p, state){
    state.players.forEach(other=>{
      if(other!==p && !other.bankrupt){ other.money -= 50; creditPlayer(p, 50, 'Grand Opera Night'); }
    });
  }},
  {text:'Holiday Fund matures. Receive $100.', apply(p){ p.money += 100; }},
  {text:'Income tax refund. Collect $20.', apply(p){ p.money += 20; }},
  {text:'Life insurance matures. Collect $100.', apply(p){ p.money += 100; }},
  {text:'Hospital fees. Pay $100.', apply(p, state){ p.money -= 100; state.freeParkingPot += 100; }},
  {text:'School fees. Pay $50.', apply(p, state){ p.money -= 50; state.freeParkingPot += 50; }},
  {text:'Receive $25 consultancy fee.', apply(p){ p.money += 25; }},
  {text:'You are assessed for street repairs: $40 per house, $115 per hotel. (No effect until houses exist.)', apply(p){ /* TODO: wire up once houses/hotels are implemented */ }},
  {text:'You have won second prize in a beauty contest. Collect $10.', apply(p){ p.money += 10; }},
  {text:'You inherit $100.', apply(p){ p.money += 100; }},
];

// Real draw/discard pile per deck (no repeats until a deck's own discards
// get reshuffled) — every real Chance/Community Chest draw site goes
// through this one function rather than picking randomly with
// replacement, so the same card can't come up over and over. Independent
// of the main CARD_DEFS deck/Sudden Death — these two piles always
// reshuffle from their own discards once empty.
function drawChanceOrChestCard(deckType){
  const isChance = deckType === 'chance';
  const drawKey = isChance ? 'chanceDrawPile' : 'chestDrawPile';
  const discardKey = isChance ? 'chanceDiscardPile' : 'chestDiscardPile';
  if(state[drawKey].length === 0){
    log('The '+(isChance?'Chance':'Community Chest')+' pile is empty — reshuffling.');
    state[drawKey] = shuffle(state[discardKey]);
    state[discardKey] = [];
  }
  const card = state[drawKey].pop();
  state[discardKey].push(card);
  return card;
}

const PLAYER_COLORS = ['#e2543c','#4c8bf5','#4cae6c','#e2b13c','#9b59b6','#26c6da','#e0629b','#9aa5b1'];

let state = null;

// Shared by newGame (every seat starts this way) and addPlayer (a
// mid-game joiner starts this way too — see addPlayer below).
function makePlayer(id, piece){
  return {
    id, name:'Player '+(id+1), color:PLAYER_COLORS[id], piece: piece || null,
    money:1500, position:0, owned:[], houses:{}, hand:[], bankrupt:false,
    disconnected:false,
    rollBonus:0, skipRentActive:false, rentMultiplierActive:false,
    inJail:false, jailTurns:0, getOutOfJailFree:0, reachedFreeParking:false,
    mortgaged:{}, smallMoveDir:null, turnsElapsed:0, pickupActive:false, forcedDice:null,
    cardsPlayedThisTurn:0, skipRollActive:false, freeloActive:false,
    wrongWayActive:false, diceCountOverride:null, upForGrabsBoughtThisTurn:false,
    pendingNotifications:[], driveByActive:null, knockDeltaActive:null,
    rolledDoubleOnesActive:false, rowdyGuestActive:false, unoReverseActive:false,
    extensionActive:0, hardHitterActive:false, hardHitterPendingCard:null,
    flashSaleBudget:0, passByRemixActive:null, stunnedActive:false,
    conductorActive:false, oneAtATimeActive:false, halfChoosingValue:null,
    rentThiefGiverId:null,
    abilities:[], luckyDuckRevived:false, builderBonusGranted:{}
  };
}

function newGame(numPlayers, pieceIds, ruleset){
  const normalizedRuleset = normalizeRuleset(ruleset);
  const players = [];
  for(let i=0;i<numPlayers;i++){
    players.push(makePlayer(i, pieceIds && pieceIds[i]));
  }
  // Rent Thief needs a third player to ever do anything, so it's not even
  // in the deck for a 2-player game — on top of whatever the ruleset itself
  // disabled.
  let deckCards = CARD_DEFS.filter(c=>!normalizedRuleset.disabledCardIds.includes(c.id));
  if(numPlayers < 3) deckCards = deckCards.filter(c=>c.type!=='rentthief');
  // Roll/turn order is randomized once here, independent of join/seat
  // order (id 0 is always whoever created the room, for reconnect
  // purposes — see server.js's seats array — but that shouldn't mean
  // they always go first). turnOrder is a shuffled permutation of player
  // ids; endTurn() below walks through it instead of raw id+1, and the
  // client renders the player list in this same order so "who's next"
  // always matches what's on screen. addPlayer appends new mid-game
  // joiners to the end of it, same as it appends to state.players.
  const turnOrder = shuffle(players.map(p=>p.id));
  state = {
    players, current: turnOrder[0], turnOrder, log:[], phase:'pre-roll', // pre-roll | awaiting-buy | turn-over | in-jail
    pendingSpace:null, freeParkingPot:200, pendingTrade:null,
    doublesStreak:0, doubleBonus:false, upForGrabs:[], preRollAction:false,
    drawPile: shuffle([...deckCards]), discardPile: [], passByTraps:[],
    pendingVampireSteal: null,
    chanceDrawPile: shuffle([...CHANCE_DECK]), chanceDiscardPile: [],
    chestDrawPile: shuffle([...CHEST_DECK]), chestDiscardPile: [],
    suddenDeath: false,
    paused: false, pausedBy: null, unpauseVotes: [],
    ruleset: normalizedRuleset,
    pendingGoAbilityChoice: null
  };
  log('Game started with '+numPlayers+' players.');
  players.forEach(p=>{
    drawCardIfRoom(p);
    drawCardIfRoom(p);
  });
  log('Every player starts with 2 cards.');
}

// Lets a brand-new player join a game already in progress — server.js
// calls this when someone joins a live room's code and there's no
// disconnected seat available to sub into instead. Starts exactly like
// everyone did at newGame (same makePlayer): $1500, position 0, no
// properties/cards/abilities. Nothing else about the game changes — the
// piles, whose turn it is, and every other player are untouched. The
// turn rotation in endTurn() already wraps on state.players.length, so
// the new player is automatically picked up next time it cycles around.
// Capped at PLAYER_COLORS.length (8) — the same hard ceiling newGame's
// own player count is clamped to.
function addPlayer(name, pieceId){
  if(state.players.length >= PLAYER_COLORS.length) return null;
  const id = state.players.length;
  const player = makePlayer(id, pieceId);
  if(name) player.name = String(name).slice(0, 20);
  state.players.push(player);
  state.turnOrder.push(id); // joins at the bottom of the roll/display order, not shuffled in
  log(player.name+' joined the game mid-way through — starting fresh, at a disadvantage to everyone already playing.');
  return id;
}

function log(msg){
  state.log.push(msg);
}

// Queues a message for a player a card was played ON (never for the
// player who played it) — surfaced in their own Turn box once it becomes
// their turn, in case they weren't paying attention to the shared log.
// Cleared automatically at the end of their next turn (see endTurn).
function notify(player, msg){
  player.pendingNotifications.push(msg);
}

// Shared tail for settling on a phase once a landing is fully resolved —
// used by both finalizeLandingPhase (the normal case) and
// resumeRevealQueueIfPending (a Chance/Chest reveal queue's own
// completion, which otherwise sets state.phase directly and would skip
// this). One at a Time hooks in here: this is the one choke point every
// landing resolution eventually passes through — immediately, after a
// buy/steal pause resolves, or after a reveal queue empties — so it's the
// right place to chain to the next individual die instead of ending the
// turn, without needing to touch buyProperty/skipBuy/
// acknowledgeRevealCard/etc. individually.
function settleLandingPhase(fallbackPhase){
  const queue = state.oneAtATimeQueue;
  if(queue && queue.values.length > 0){
    advanceOneAtATimeDie();
    return;
  }
  if(queue){
    // Granting the doubles bonus and settling the phase are independent,
    // same as the plain (non-one-at-a-time) path: resolveLanding already
    // decided the phase for real (or a pending buy/steal decision would
    // have kept the queue non-empty above), so it's set unconditionally
    // here — doubleBonus just additionally flags that a "Roll Again"
    // button should show once phase reaches 'turn-over'.
    const player = state.players[queue.playerId];
    state.oneAtATimeQueue = null;
    if(queue.knockback) applyKnockbackEffect(player, queue.knockback);
    state.doubleBonus = queue.isDouble && !player.inJail;
    if(state.doubleBonus){
      player.turnsElapsed = (player.turnsElapsed||0) + 1;
      player.cardsPlayedThisTurn = 0;
      player.upForGrabsBoughtThisTurn = false;
      log(player.name+' rolled doubles and gets to roll again!');
    }
    state.phase = resolvePendingGoChoicePhase(fallbackPhase);
    return;
  }
  state.phase = resolvePendingGoChoicePhase(fallbackPhase);
}

// Terminal phase for any landing resolution (dice-roll or card-driven).
// state.preRollAction marks a landing that was triggered by playing a
// card in the pre-roll phase (teleport-family cards, Taxation, Lottery's
// send-to-Free-Parking) rather than by an actual dice roll — those should
// return the player to 'pre-roll' so they can still roll this turn,
// instead of ending it. See the "cards don't end your turn" gotcha.
function finalizeLandingPhase(){
  const fallback = state.preRollAction ? 'pre-roll' : 'turn-over';
  state.preRollAction = false;
  settleLandingPhase(fallback);
}

// Vampire's stolen house/hotel-level can go on ANY property the player
// owns, any type, no monopoly/even-build/hotel-cap restriction at all.
function placeVampireHouse(destPos){
  const player = currentPlayer();
  if(state.phase !== 'vampire-steal-placement') return;
  if(!player.owned.includes(destPos)) return;
  const destSpace = SPACES[destPos];
  if(destSpace.type !== 'property' && destSpace.type !== 'railroad' && destSpace.type !== 'utility') return;
  player.houses[destPos] = (player.houses[destPos]||0) + 1;
  log(player.name+' places the stolen house on '+destSpace.name+' ('+houseLevelLabel(player.houses[destPos])+').');
  state.pendingVampireSteal = null;
  finalizeLandingPhase();
}

// Kicks off One at a Time's per-die sequence: rather than moving by the
// full roll total in one shot, each die is applied (and its landing fully
// resolved) one at a time, chained together via finalizeLandingPhase.
// Drive By/Pass By/Knockback/up-for-grabs/pickup are deliberately still
// computed once for the whole roll (in rollDice, before this is called) —
// only the final movement+landing is split per die.
function beginOneAtATimeSequence(player, diceValues, dir, isDouble, knockback){
  state.oneAtATimeQueue = { playerId: player.id, values: diceValues.slice(), dir, isDouble, knockback };
  advanceOneAtATimeDie();
}

function advanceOneAtATimeDie(){
  const queue = state.oneAtATimeQueue;
  const player = state.players[queue.playerId];
  const value = queue.values.shift();
  const fromPos = player.position;
  let passedGo;
  if(queue.dir > 0){
    passedGo = (fromPos + value) >= 40;
    player.position = (fromPos + value) % 40;
  } else {
    player.position = ((fromPos - value) % 40 + 40) % 40;
    passedGo = (player.position === 0);
  }
  markFreeParkingProgress(player, fromPos, player.position, value, queue.dir);
  if(passedGo){
    awardPassingGoWithCard(player);
  }
  resolveLanding(player);
}

function currentPlayer(){ return state.players[state.current]; }

function drawCardIfRoom(player){
  const card = drawFromPile();
  if(!card) return; // truly no cards left anywhere — shouldn't happen
  if(player.hand.length < maxHandSize(player)){
    player.hand.push(card);
    log(player.name+' drew a card: '+card.name+'.');
  } else {
    state.discardPile.push(card);
    log(player.name+"'s hand is full (5) — drew "+card.name+' and it went straight to the discard pile.');
  }
}

// Giveaway's distribution step: the cards drawn at play time sit in
// state.pendingGiveaway.cards (not the current player's hand) until
// handed out one at a time. Once every other player has one, whatever's
// left (always exactly one card) automatically goes to the player who
// played the card — see the trailing "keep the last card" note in
// CLAUDE_1.md rather than requiring an explicit self-target click.
function assignGiveawayCard(cardIdx, targetPlayerId){
  const player = currentPlayer();
  const pending = state.pendingGiveaway;
  if(!pending || state.phase !== 'giveaway-distributing') return;
  if(!pending.remainingPlayerIds.includes(targetPlayerId)) return;
  const c = pending.cards[cardIdx];
  if(!c) return;
  const target = state.players[targetPlayerId];
  target.hand.push(c);
  pending.cards.splice(cardIdx,1);
  pending.remainingPlayerIds = pending.remainingPlayerIds.filter(id=>id!==targetPlayerId);
  log(player.name+' gave "'+c.name+'" to '+target.name+' (Giveaway).');
  if(target.id !== player.id) notify(target, player.name+' gave you a card via Giveaway — check your hand!');

  if(pending.remainingPlayerIds.length === 0){
    const lastCard = pending.cards[0];
    if(lastCard){
      player.hand.push(lastCard);
      log(player.name+' keeps the last card from Giveaway: "'+lastCard.name+'".');
    }
    state.pendingGiveaway = null;
    state.phase = 'pre-roll';
    checkHandTrimming();
  }
}

// ReRoll: discards happen first (cards go back into the draw pile, not
// the discard pile; properties are stripped of houses/mortgage and
// returned to the bank), then replacements are drawn — one new card per
// discarded card, one new random unowned property per discarded
// property. Deliberately no exclusion against redrawing the very thing
// just given up; that's just how a random reroll can land.
function performReroll(cardIndices, propertyPositions){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'reroll' || state.phase !== 'choosing-reroll-items') return;
  cardIndices = (cardIndices||[]).filter(i => Number.isInteger(i) && i>=0 && i<player.hand.length);
  propertyPositions = (propertyPositions||[]).filter(pos => player.owned.includes(pos));
  const totalCount = cardIndices.length + propertyPositions.length;
  if(totalCount === 0 || totalCount > 3){
    log('Choose between 1 and 3 cards/properties to reroll.');
    return;
  }

  const sortedCardIdx = cardIndices.slice().sort((a,b)=>b-a);
  const returnedCards = sortedCardIdx.map(i => player.hand.splice(i,1)[0]);
  returnedCards.forEach(c => state.drawPile.push(c));
  state.drawPile = shuffle(state.drawPile);

  propertyPositions.forEach(pos=>{
    player.owned = player.owned.filter(p=>p!==pos);
    delete player.houses[pos];
    delete player.mortgaged[pos];
    state.upForGrabs = state.upForGrabs.filter(p=>p!==pos);
  });

  returnedCards.forEach(()=>{
    const newCard = drawFromPile();
    if(newCard) player.hand.push(newCard);
  });

  propertyPositions.forEach(()=>{
    const unowned = unownedPropertyPositions();
    if(unowned.length > 0){
      const newPos = unowned[Math.floor(Math.random()*unowned.length)];
      player.owned.push(newPos);
    } else {
      log(player.name+' had no unowned properties left to reroll into.');
    }
  });

  log(player.name+' rerolled '+cardIndices.length+' card(s) and '+propertyPositions.length+' propert'+(propertyPositions.length===1?'y':'ies')+'.');
  checkBuilderBonus(player);
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
  checkHandTrimming();
}

function playCard(cardIndex){
  const player = currentPlayer();

  // Jail Break is the one card playable from the 'in-jail' phase instead of
  // 'pre-roll' — it has its own gate here and skips every other guard below
  // (first-turn lock, one-card-per-turn), since jail turns don't work like
  // normal turns to begin with.
  const jailBreakCard = player.hand[cardIndex];
  if(jailBreakCard && jailBreakCard.type === 'jailbreak' && state.phase === 'in-jail'){
    const others = state.players.filter(p => p.id !== player.id && p.inJail && !p.bankrupt);
    player.hand.splice(cardIndex,1);
    state.discardPile.push(jailBreakCard);
    player.inJail = false;
    player.jailTurns = 0;
    let collected = 0;
    others.forEach(p=>{
      p.inJail = false;
      p.jailTurns = 0;
      p.money -= 200;
      creditPlayer(player, 200, 'Jail Break fee');
      collected += 200;
      notify(p, player.name+' used "'+jailBreakCard.name+'" to break you out of Jail — you paid them $200.');
    });
    log(player.name+' played "'+jailBreakCard.name+'" — broke everyone out of Jail'+(others.length>0?' and collected $'+collected+' from '+others.map(p=>p.name).join(', '):' (no one else was in Jail)')+'.');
    state.phase = 'pre-roll';
    return;
  }

  if(state.phase !== 'pre-roll') return;
  if((player.turnsElapsed||0) === 0){
    log("Cards can't be played on your first turn.");
    return;
  }
  if((player.cardsPlayedThisTurn||0) >= maxCardsPerTurn(player)){
    log("Only "+maxCardsPerTurn(player)+" card"+(maxCardsPerTurn(player)>1?'s':'')+" per turn — unless you roll doubles for another.");
    return;
  }
  if(player.stunnedActive){
    log(player.name+" is Stunned this turn — no cards, trading, or property actions, just rolling and paying rent.");
    return;
  }
  const card = player.hand[cardIndex];

  if(card.type === 'jailbreak'){
    log(player.name+" can't use \""+card.name+"\" unless they're in Jail.");
    return;
  }

  if(card.type === 'teleport'){
    if(!player.reachedFreeParking){
      log(player.name+" can't use \""+card.name+"\" until they've reached or passed Free Parking.");
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-destination';
    log(player.name+' is playing "'+card.name+'" — choose a destination.');
    return;
  }

  if(card.type === 'taxation'){
    if(!player.reachedFreeParking){
      log(player.name+" can't use \""+card.name+"\" until they've reached or passed Free Parking.");
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose a target.');
    return;
  }

  if(card.type === 'coinbonus'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-coins';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'coincurse'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-curse';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'rollboost'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who gets it.');
    return;
  }

  if(card.type === 'pickup'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.pickupActive = true;
    log(player.name+' played "'+card.name+'" — will pick up cards for Chance/Community Chest passed on the next roll.');
    return;
  }

  if(card.type === 'propertytheft'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    const targets = findTheftTargets(player);
    const givebackCandidates = player.owned.filter(p => (player.houses[p]||0) === 0);
    if(targets.length === 0){
      log(player.name+' played "'+card.name+'" but has no near-complete monopoly to steal into.');
      return;
    }
    if(givebackCandidates.length === 0){
      log(player.name+' played "'+card.name+'" but has nothing eligible to give back in return — no effect.');
      return;
    }
    state.pendingCardPlay = { card, targets };
    state.phase = 'choosing-theft-target';
    log(player.name+' is playing "'+card.name+'" — choose a property to steal.');
    return;
  }

  if(card.type === 'custom'){
    if(player.halfChoosingValue != null){
      log(player.name+" can't use \""+card.name+"\" — one of their next dice is already locked in by Half Choosing.");
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'flipping-custom';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'slowflips'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who it targets.');
    return;
  }

  if(card.type === 'coinsteal'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-steal';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'smallmoves'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    const heads = flipCoin(player, 'H') === 'H';
    player.smallMoveDir = heads ? 1 : -1;
    log(player.name+' played "'+card.name+'" and flipped '+(heads?'Heads (forward)':'Tails (backward)')+' — usable once after this roll.');
    return;
  }

  if(card.type === 'switchrandom'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    const others = state.players.filter(p=>p.id!==player.id && !p.bankrupt && !p.inJail);
    if(others.length === 0){
      log(player.name+' played "'+card.name+'" but there\'s no one else to swap with.');
      return;
    }
    const target = others[Math.floor(Math.random()*others.length)];
    swapPositions(player, target);
    log(player.name+' played "'+card.name+'".');
    notify(target, player.name+' swapped places with you using "'+card.name+'".');
    return;
  }

  if(card.type === 'skip'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who skips their next roll.');
    return;
  }

  if(card.type === 'switch'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    const others = state.players.filter(p=>p.id!==player.id && !p.bankrupt && !p.inJail);
    if(others.length === 0){
      log(player.name+' played "'+card.name+'" but there\'s no one else to swap with.');
      return;
    }
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who to swap with.');
    return;
  }

  if(card.type === 'switchany'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-switch-first';
    log(player.name+' is playing "'+card.name+'" — choose the first player to swap.');
    return;
  }

  if(card.type === 'pickupchance'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    log(player.name+' played "'+card.name+'" — drawing 3 Chance cards.');
    startCardReveal(['chance','chance','chance'], 'pre-roll');
    return;
  }

  if(card.type === 'pickupboth'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    log(player.name+' played "'+card.name+'" — drawing 2 Chance and 2 Community Chest cards.');
    startCardReveal(['chance','chance','chest','chest'], 'pre-roll');
    return;
  }

  if(card.type === 'drawcards'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    drawCardIfRoom(player);
    drawCardIfRoom(player);
    log(player.name+' played "'+card.name+'" and drew 2 cards.');
    return;
  }

  if(card.type === 'pickupcommunitychest'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    log(player.name+' played "'+card.name+'" — drawing 3 Community Chest cards.');
    startCardReveal(['chest','chest','chest'], 'pre-roll');
    return;
  }

  if(card.type === 'flipdraw'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-flipdraw';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'buyer'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    const dest = nearestUnownedProperty(player.position);
    if(dest === null){
      log(player.name+' played "'+card.name+'" but every property is already owned — no effect.');
      return;
    }
    advanceTo(player, dest, true);
    log(player.name+' played "'+card.name+'" and warped to '+SPACES[dest].name+'.');
    state.preRollAction = true; // playing a card doesn't consume your roll
    resolveLanding(player);
    return;
  }

  if(card.type === 'lottery'){
    if(!player.reachedFreeParking){
      log(player.name+" can't use \""+card.name+"\" until they've reached or passed Free Parking.");
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-lottery';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'demolisher'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-demolisher';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'freelo'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.freeloActive = true;
    log(player.name+' played "'+card.name+'" — the next property they land on will be free or rent-free.');
    return;
  }

  if(card.type === 'builder'){
    if(!playerHasMonopoly(player)){
      log(player.name+" can't use \""+card.name+"\" without owning a full color set (monopoly).");
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-builder';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'wrongway'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who goes the wrong way.');
    return;
  }

  if(card.type === 'diced'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-dice-count';
    log(player.name+' is playing "'+card.name+'" — choose how many dice to roll next.');
    return;
  }

  if(card.type === 'curseddie'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who gets stuck with one die.');
    return;
  }

  if(card.type === 'goanywhere'){
    if(!player.reachedFreeParking){
      log(player.name+" can't use \""+card.name+"\" until they've reached or passed Free Parking.");
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-goanywhere-destination';
    log(player.name+' is playing "'+card.name+'" — choose a destination.');
    return;
  }

  if(card.type === 'driveby'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.driveByActive = card.value;
    log(player.name+' played "'+card.name+'" — will steal $'+card.value+' from every player they pass this turn.');
    return;
  }

  if(card.type === 'passby'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who to target.');
    return;
  }

  if(card.type === 'jumpinplace'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    log(player.name+' played "'+card.name+'" and jumps in place on '+SPACES[player.position].name+'.');
    state.preRollAction = true; // playing a card doesn't consume your roll
    resolveLanding(player);
    return;
  }

  if(card.type === 'cardswitch'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose whose hand to look through.');
    return;
  }

  if(card.type === 'gamblingluck'){
    if(!player.rolledDoubleOnesActive){
      log(player.name+" can't use \""+card.name+"\" unless their previous roll was two 1s.");
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.rolledDoubleOnesActive = false;
    player.money += 1000;
    log(player.name+' played "'+card.name+'" and cashes in on rolling two 1s for $1000!');
    return;
  }

  if(card.type === 'knockback'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.knockDeltaActive = -1;
    log(player.name+' played "'+card.name+'" — will knock back everyone they pass this turn.');
    return;
  }

  if(card.type === 'knockforward'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.knockDeltaActive = 1;
    log(player.name+' played "'+card.name+'" — will knock forward everyone they pass this turn.');
    return;
  }

  if(card.type === 'jailed'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    const pool = state.players.filter(p => !p.bankrupt && !p.inJail && !hasAbility(p,'officer'));
    if(pool.length === 0){
      log(player.name+' played "'+card.name+'" but no one is eligible to be sent to Jail.');
      return;
    }
    const target = pool[Math.floor(Math.random()*pool.length)];
    log(player.name+' played "'+card.name+'" — picking a random player to send to Jail...');
    sendToJail(target);
    if(target.id === player.id){
      state.phase = 'turn-over'; // same as the 3-doubles-in-a-row self-jailing case
    } else {
      notify(target, player.name+' played "'+card.name+'" — you\'ve been sent to Jail!');
    }
    return;
  }

  if(card.type === 'rowdyguest'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.rowdyGuestActive = true;
    log(player.name+' played "'+card.name+'" — will knock 3 houses off the next property they land on, if any are there.');
    return;
  }

  if(card.type === 'unoreverse'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.unoReverseActive = true;
    log(player.name+' played "'+card.name+'" — rent is reversed on the next property they land on.');
    return;
  }

  if(card.type === 'extension'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who gets the extra turn.');
    return;
  }

  if(card.type === 'drivebycoin'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-drivebycoin';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'rentthief'){
    if(state.players.filter(p=>!p.bankrupt).length < 3){
      log(player.name+" can't use \""+card.name+"\" with fewer than 3 active players.");
      return;
    }
    const rentThiefOthers = state.players.filter(p => p.id !== player.id && !p.bankrupt);
    if(rentThiefOthers.length === 0){
      log(player.name+' played "'+card.name+'" but there\'s no one else to give it to.');
      return;
    }
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who gets it.');
    return;
  }

  if(card.type === 'hardhitter'){
    player.hand.splice(cardIndex,1);
    // Not discarded here — the physical card persists until it resolves,
    // either destroyed on a successful double-rent trigger or returned to
    // the target's hand if their next landing owes no rent.
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who gets it.');
    return;
  }

  if(card.type === 'flashsale'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.flashSaleBudget = 1000;
    log(player.name+' played "'+card.name+'" — houses/hotels are half off (up to $1000 of full-price value) for the rest of this turn.');
    return;
  }

  if(card.type === 'passbyremix'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who to target.');
    return;
  }

  if(card.type === 'stunned'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who gets Stunned.');
    return;
  }

  if(card.type === 'giveaway'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    const activePlayers = state.players.filter(p=>!p.bankrupt);
    const drawn = [];
    activePlayers.forEach(()=>{ const c = drawFromPile(); if(c) drawn.push(c); });
    const others = activePlayers.filter(p=>p.id!==player.id);
    state.pendingGiveaway = { cards: drawn, remainingPlayerIds: others.map(p=>p.id) };
    state.phase = 'giveaway-distributing';
    log(player.name+' played "'+card.name+'" — drew '+drawn.length+' card(s) to hand out, one per player.');
    return;
  }

  if(card.type === 'teleportother'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who to teleport.');
    return;
  }

  if(card.type === 'averageroll'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.halfChoosingValue = null; // negates a pending Half Choosing, per its own card text
    player.forcedDice = { d1: 3, d2: 4 };
    log(player.name+' played "'+card.name+'" — instantly rolling a 3 and a 4.');
    rollDice();
    return;
  }

  if(card.type === 'conductor'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    player.conductorActive = true;
    log(player.name+' played "'+card.name+'" — their next roll redirects through the railroads.');
    return;
  }

  if(card.type === 'gamblingnight'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card, flips:null, headsCount:0 };
    state.phase = 'flipping-gamblingnight';
    log(player.name+' is playing "'+card.name+'".');
    return;
  }

  if(card.type === 'oneatatime'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who rolls dice one at a time from now on.');
    return;
  }

  if(card.type === 'halfchoosing'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-target';
    log(player.name+' is playing "'+card.name+'" — choose who to target.');
    return;
  }

  if(card.type === 'reroll'){
    player.hand.splice(cardIndex,1);
    state.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
    state.pendingCardPlay = { card };
    state.phase = 'choosing-reroll-items';
    log(player.name+' is playing "'+card.name+'" — choose up to 3 cards or properties to reroll.');
    return;
  }

  player.hand.splice(cardIndex,1);
  state.discardPile.push(card);
  player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn||0) + 1;
  card.apply(player);
  log(player.name+' played "'+card.name+'".');
}

function swapPositions(a, b){
  const posA = a.position, posB = b.position;
  const aReached = a.reachedFreeParking, bReached = b.reachedFreeParking;
  a.position = posB;
  b.position = posA;
  // Swapping never awards GO money/a card either way. But if your new spot
  // is past Free Parking, you inherit "reached Free Parking" from whoever
  // you swapped with — only if THEY had legitimately reached it themselves.
  if(a.position > 20 && bReached) a.reachedFreeParking = true;
  if(b.position > 20 && aReached) b.reachedFreeParking = true;
  log(a.name+' and '+b.name+' swapped places: '+a.name+' is now on '+SPACES[a.position].name+', '+b.name+' is now on '+SPACES[b.position].name+'.');
}

function chooseTeleportDestination(pos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;
  advanceTo(player, pos, true);
  log(player.name+' warped to '+SPACES[pos].name+' using "'+pending.card.name+'".');
  state.pendingCardPlay = null;
  state.preRollAction = true; // playing a card doesn't consume your roll — see the "cards don't end your turn" gotcha
  resolveTeleportLanding(player, pos);
}

function applyRollBoost(target, amount){
  // A positive boost clears any existing negative ("minus roll") effect first.
  // A negative boost (Slow cards) just stacks with whatever's already there.
  if(amount > 0 && target.rollBonus < 0) target.rollBonus = 0;
  target.rollBonus += amount;
}

function chooseCardTarget(targetId){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;

  if(pending.card.type === 'taxation'){
    pending.targetId = targetId;
    state.phase = 'choosing-destination';
    return;
  }

  if(pending.card.type === 'rollboost'){
    const target = state.players[targetId];
    applyRollBoost(target, pending.card.value);
    log(player.name+' used "'+pending.card.name+'" to give '+target.name+' '+(pending.card.value>0?'+':'')+pending.card.value+' to their next roll.');
    if(target.id !== player.id) notify(target, player.name+' gave you '+(pending.card.value>0?'+':'')+pending.card.value+' to your next roll with "'+pending.card.name+'".');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'slowflips'){
    pending.targetId = targetId;
    state.phase = 'flipping-slowflips';
    return;
  }

  if(pending.card.type === 'skip'){
    const target = state.players[targetId];
    target.skipRollActive = true;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' will skip their next roll.');
    if(target.id !== player.id) notify(target, player.name+' played "'+pending.card.name+'" on you — you\'ll skip your next roll.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'switch'){
    const target = state.players[targetId];
    if(target.id === player.id) return; // must swap with someone else
    swapPositions(player, target);
    log(player.name+' used "'+pending.card.name+'" to swap places with '+target.name+'.');
    notify(target, player.name+' swapped places with you using "'+pending.card.name+'".');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'lottery'){
    const target = state.players[targetId];
    if(target.id === player.id) return; // must send someone else
    state.pendingCardPlay = null;
    advanceTo(target, 20, true); // Free Parking
    log(player.name+' used "'+pending.card.name+'" to send '+target.name+' to Free Parking.');
    notify(target, player.name+' sent you to Free Parking with "'+pending.card.name+'".');
    state.preRollAction = true; // playing a card doesn't consume your roll
    resolveLanding(target);
    return;
  }

  if(pending.card.type === 'wrongway'){
    const target = state.players[targetId];
    target.wrongWayActive = true;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' will move backwards on their next roll.');
    if(target.id !== player.id) notify(target, player.name+' played "'+pending.card.name+'" on you — you\'ll move backwards on your next roll.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'curseddie'){
    const target = state.players[targetId];
    target.diceCountOverride = 1;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' will only roll one die on their next turn.');
    if(target.id !== player.id) notify(target, player.name+' played "'+pending.card.name+'" on you — you\'ll only roll one die on your next turn.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'passby'){
    pending.targetId = targetId;
    state.phase = 'choosing-passby-property';
    return;
  }

  if(pending.card.type === 'cardswitch'){
    const target = state.players[targetId];
    if(target.hand.length === 0){
      log(player.name+' used "'+pending.card.name+'" on '+target.name+' but they have no cards to look through — no effect.');
      state.pendingCardPlay = null;
      state.phase = 'pre-roll';
      return;
    }
    if(player.hand.length === 0){
      log(player.name+' used "'+pending.card.name+'" on '+target.name+' but has no card of their own to swap in return — no effect.');
      state.pendingCardPlay = null;
      state.phase = 'pre-roll';
      return;
    }
    pending.targetId = targetId;
    state.phase = 'choosing-cardswitch-theirs';
    return;
  }

  if(pending.card.type === 'extension'){
    const target = state.players[targetId];
    target.extensionActive = (target.extensionActive||0) + 1;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' gets an extra turn on their next non-doubles roll.');
    if(target.id !== player.id) notify(target, player.name+' gave you "'+pending.card.name+'" — your next non-doubles roll will still let you go again.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'hardhitter'){
    if(targetId === player.id) return; // must give it to another player
    const target = state.players[targetId];
    target.hardHitterActive = true;
    target.hardHitterPendingCard = pending.card;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' pays double rent on their next landing, or keeps the card if none is owed.');
    notify(target, player.name+' gave you "'+pending.card.name+'" — your next landing owing rent gets doubled, or you keep the card.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'rentthief'){
    if(targetId === player.id) return; // must give it to someone else
    const target = state.players[targetId];
    target.rentThiefGiverId = player.id;
    log(player.name+' used "'+pending.card.name+'" on '+target.name+' — the next rent '+target.name+' owes a third player comes to '+player.name+' instead.');
    notify(target, player.name+' used "'+pending.card.name+'" on you — the next rent you owe a third player goes to '+player.name+' instead.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'passbyremix'){
    if(targetId === player.id) return; // must give it to another player
    const target = state.players[targetId];
    target.passByRemixActive = player.id;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' pays '+player.name+' $100 for every one of their properties passed this next roll.');
    notify(target, player.name+' gave you "'+pending.card.name+'" — you\'ll pay them $100 per property of theirs you pass on your next roll.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'stunned'){
    if(targetId === player.id) return; // must give it to another player
    const target = state.players[targetId];
    target.stunnedActive = true;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' is Stunned for their entire next turn.');
    notify(target, player.name+' Stunned you with "'+pending.card.name+'" — your next turn is roll-and-pay-rent only.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'teleportother'){
    if(targetId === player.id) return; // must target another player
    pending.targetId = targetId;
    state.phase = 'choosing-teleportother-destination';
    return;
  }

  if(pending.card.type === 'oneatatime'){
    const target = state.players[targetId];
    target.oneAtATimeActive = true;
    log(player.name+' used "'+pending.card.name+'" — '+target.name+' rolls dice one at a time from now on.');
    if(target.id !== player.id) notify(target, player.name+' gave you "'+pending.card.name+'" — you\'ll roll each die separately from now on.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }

  if(pending.card.type === 'halfchoosing'){
    if(targetId === player.id) return; // cannot target yourself
    pending.targetId = targetId;
    state.phase = 'choosing-halfchoosing-value';
    return;
  }
}

function chooseCardSwitchTheirs(cardIdx){
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'cardswitch') return;
  const target = state.players[pending.targetId];
  if(cardIdx < 0 || cardIdx >= target.hand.length) return;
  pending.theirCardIdx = cardIdx;
  state.phase = 'choosing-cardswitch-mine';
}

function chooseCardSwitchMine(myCardIdx){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'cardswitch') return;
  if(myCardIdx < 0 || myCardIdx >= player.hand.length) return;
  const target = state.players[pending.targetId];
  const theirCard = target.hand[pending.theirCardIdx];
  const myCard = player.hand[myCardIdx];
  target.hand.splice(pending.theirCardIdx, 1, myCard);
  player.hand.splice(myCardIdx, 1, theirCard);
  log(player.name+' used "'+pending.card.name+'" to swap a card with '+target.name+'.');
  if(target.id !== player.id) notify(target, player.name+' swapped one of your cards using "'+pending.card.name+'".');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function choosePassByProperty(pos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'passby') return;
  const space = SPACES[pos];
  if(!space || (space.type!=='property' && space.type!=='railroad' && space.type!=='utility')) return;
  const target = state.players[pending.targetId];
  const pct = pending.card.pct;
  state.passByTraps.push({ targetId: target.id, position: pos, pct });
  log(player.name+' used "'+pending.card.name+'" — if '+target.name+' passes '+space.name+', they\'ll pay '+Math.round(pct*100)+'% rent on it.');
  if(target.id !== player.id) notify(target, player.name+' set a trap on '+space.name+' with "'+pending.card.name+'" — passing it will cost you '+Math.round(pct*100)+'% rent.');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

// Checks state.passByTraps for any trap belonging to `player` whose property
// falls in the path they just moved through (positionsInPath), pays the
// trap's percentage of rent to the owner, and removes the trap either way
// (one-shot per trap, whether or not it had an eligible owner to pay).
function resolvePassByTraps(player, fromPos, steps, dir){
  if(!state.passByTraps || state.passByTraps.length === 0) return;
  const passedPositions = positionsInPath(fromPos, steps, dir);
  const triggered = state.passByTraps.filter(t => t.targetId === player.id && passedPositions.includes(t.position));
  if(triggered.length === 0) return;
  state.passByTraps = state.passByTraps.filter(t => !triggered.includes(t));
  triggered.forEach(trap=>{
    const space = SPACES[trap.position];
    const owner = findOwner(trap.position);
    if(!owner || owner.id === player.id){
      log(player.name+' passed '+space.name+' but the Pass By trap had no effect (no eligible owner).');
      return;
    }
    if(player.skipRentActive){
      player.skipRentActive = false;
      log(player.name+' skipped the Pass By rent using Toll Skip!');
      return;
    }
    if(owner.inJail){
      log(owner.name+' is in jail and cannot collect the Pass By rent right now.');
      return;
    }
    if(owner.mortgaged[trap.position]){
      log(space.name+' is mortgaged — no Pass By rent owed.');
      return;
    }
    let fullRent;
    if(space.type === 'property'){
      fullRent = effectivePropertyRent(owner, trap.position, space);
    } else if(space.type === 'railroad'){
      const ownedCount = owner.owned.filter(p => SPACES[p].type==='railroad').length;
      fullRent = RAILROAD_RENT[ownedCount-1];
    } else { // utility
      const ownedCount = owner.owned.filter(p => SPACES[p].type==='utility').length;
      const d1 = 1+Math.floor(Math.random()*6);
      const d2 = 1+Math.floor(Math.random()*6);
      const multiplier = ownedCount >= 2 ? 10 : 4;
      fullRent = (d1+d2) * multiplier;
      log(player.name+' threw '+d1+' + '+d2+' for the Pass By utility rent calculation.');
    }
    if(owner.rentMultiplierActive){
      fullRent *= 2;
      owner.rentMultiplierActive = false;
      log('(Double Toll was active — rent doubled before the Pass By percentage!)');
    }
    let rent = Math.ceil(fullRent * trap.pct);
    const beforeAbilityRent = rent;
    rent = applyRentAbilities(player, owner, rent);
    logRentAbilityNote(player, owner, beforeAbilityRent, rent);
    player.money -= rent;
    creditPlayer(owner, rent, 'Pass By rent');
    log(player.name+' passed '+space.name+' and paid '+Math.round(trap.pct*100)+'% rent ($'+rent+') to '+owner.name+' (Pass By).');
    checkBankrupt(player, owner);
  });
}

function chooseSwitchAnyFirst(targetId){
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'switchany') return;
  pending.firstId = targetId;
  state.phase = 'choosing-switch-second';
}

function chooseSwitchAnySecond(targetId){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'switchany') return;
  if(targetId === pending.firstId) return; // must be two different players
  const a = state.players[pending.firstId];
  const b = state.players[targetId];
  swapPositions(a, b);
  log(player.name+' used "'+pending.card.name+'" to swap '+a.name+' and '+b.name+'.');
  if(a.id !== player.id) notify(a, player.name+' swapped you with '+b.name+' using "'+pending.card.name+'".');
  if(b.id !== player.id) notify(b, player.name+' swapped you with '+a.name+' using "'+pending.card.name+'".');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function skipRoll(){
  const player = currentPlayer();
  if(state.phase !== 'pre-roll') return;
  if(!player.skipRollActive) return;
  player.skipRollActive = false;
  player.halfChoosingValue = null; // negated — the roll it would've applied to never happens
  log(player.name+' skips their roll this turn (Skip card).');
  state.phase = 'turn-over';
}

function flipCoinsForFlipDraw(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'flipdraw') return;
  pending.flips = [0,1,2].map(()=> flipCoin(player, 'H'));
  pending.headsCount = pending.flips.filter(f=>f==='H').length;
  log(player.name+' flipped for "'+pending.card.name+'": '+pending.flips.join(', ')+' ('+pending.headsCount+' heads).');
  state.phase = 'flipdraw-result';
}

function resolveFlipDrawOutcome(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'flipdraw') return;
  for(let i=0;i<pending.headsCount;i++) drawCardIfRoom(player);
  log(player.name+' drew '+pending.headsCount+' card(s) from "'+pending.card.name+'".');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function flipCoinsForDemolisher(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'demolisher') return;
  pending.flips = [0,1,2].map(()=> flipCoin(player, 'H'));
  pending.headsCount = pending.flips.filter(f=>f==='H').length;
  pending.demolishesRemaining = pending.headsCount;
  log(player.name+' flipped for "'+pending.card.name+'": '+pending.flips.join(', ')+' ('+pending.headsCount+' heads).');
  state.phase = 'demolisher-destroying';
}

// Lets the player pick which opposing property to knock a house off,
// repeated up to pending.demolishesRemaining times (once per heads).
function demolishHouse(position){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'demolisher' || state.phase !== 'demolisher-destroying') return;
  if(pending.demolishesRemaining <= 0) return;
  const owner = findOwner(position);
  if(!owner || owner.id === player.id) return; // must be an opponent's property
  const current = owner.houses[position] || 0;
  if(current <= 0) return;
  owner.houses[position] = current - 1;
  pending.demolishesRemaining -= 1;
  log(player.name+' used "'+pending.card.name+'" to knock '+(current===5?'a Hotel down to 4 houses':'a house off')+' '+SPACES[position].name+' ('+owner.name+').');
  if(pending.demolishesRemaining <= 0){
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
  }
}

function skipDemolisherDestroy(){
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'demolisher') return;
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function flipCoinsForLottery(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'lottery') return;
  pending.flips = [0,1].map(()=> flipCoin(player, 'H'));
  pending.headsCount = pending.flips.filter(f=>f==='H').length;
  log(player.name+' flipped for "'+pending.card.name+'": '+pending.flips.join(', ')+' ('+pending.headsCount+' heads).');
  state.phase = 'lottery-result';
}

function resolveLotteryOutcome(){
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'lottery') return;
  if(pending.headsCount === 2){
    pending.restricted = false;
    state.phase = 'choosing-lottery-destination';
  } else if(pending.headsCount === 1){
    pending.restricted = true;
    state.phase = 'choosing-lottery-destination';
  } else {
    state.phase = 'choosing-target';
  }
}

function chooseLotteryDestination(pos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'lottery') return;
  if(pending.restricted && (pos === 0 || pos === 20)) return; // GO and Free Parking excluded on a single heads
  state.pendingCardPlay = null;
  if(pos === 0){
    if(!state.suddenDeath) player.money += 400;
    grantGoReward(player); // landing on GO always grants an ability/a card, even via a card effect
    log(player.name+' used "'+pending.card.name+'" and took '+(state.suddenDeath?'no payout (Sudden Death) instead of warping':'$400 instead of warping')+' to GO.');
    state.phase = resolvePendingGoChoicePhase('pre-roll'); // playing a card doesn't consume your roll
    return;
  }
  player.position = pos;
  log(player.name+' used "'+pending.card.name+'" to warp to '+SPACES[pos].name+'.');
  state.preRollAction = true; // playing a card doesn't consume your roll
  resolveLanding(player);
}

function flipCoinsForBuilder(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'builder') return;
  pending.flips = [0,1,2,3].map(()=> flipCoin(player, 'H'));
  pending.headsCount = pending.flips.filter(f=>f==='H').length;
  pending.buildsRemaining = pending.headsCount;
  log(player.name+' flipped for "'+pending.card.name+'": '+pending.flips.join(', ')+' ('+pending.headsCount+' heads).');
  state.phase = 'builder-building';
}

// Lets the player repeatedly pick any eligible property (full color set
// owned, even-build respected, not already a Hotel, affordable) and build
// one house on it per call, up to pending.buildsRemaining times — avoids
// having to back out of a property detail view between each purchase.
function buildHouseFromBuilder(position){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'builder' || state.phase !== 'builder-building') return;
  if(pending.buildsRemaining <= 0) return;
  if(!player.owned.includes(position)) return;
  const space = SPACES[position];
  if(space.type !== 'property' || !ownsFullColorGroup(player, position)) return;
  const current = player.houses[position] || 0;
  if(current > groupMinLevel(player, space.color)) return; // even-build
  if(current >= maxBuildLevelFor(player)) return; // 1 Hotel cap normally, 2 Hotels for Builder
  player.houses[position] = current + 1; // Builder's houses are free — no cost check/deduction
  pending.buildsRemaining -= 1;
  log(player.name+' used "'+pending.card.name+'" to build a free '+houseLevelLabel(player.houses[position])+' on '+space.name+'.');
  if(pending.buildsRemaining <= 0){
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
  }
}

function skipBuilderBuild(){
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'builder') return;
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function chooseDiceCount(n){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'diced') return;
  if(n !== 1 && n !== 3) return;
  // High Roller already has 3 dice baseline, so Diced's "3" option bumps to 4 for them instead.
  const actualN = (n === 3 && hasAbility(player,'highroller')) ? 4 : n;
  player.diceCountOverride = actualN;
  log(player.name+' set up "'+pending.card.name+'" — next roll will use '+actualN+' die'+(actualN>1?'s':'')+'.');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function chooseGoAnywhereDestination(pos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'goanywhere') return;
  state.pendingCardPlay = null;
  if(pos === 0){
    if(!state.suddenDeath) player.money += 400;
    grantGoReward(player);
    log(player.name+' used "'+pending.card.name+'" — landed on GO and took '+(state.suddenDeath?'no payout (Sudden Death)':'$400')+'.');
    state.phase = resolvePendingGoChoicePhase('pre-roll'); // playing a card doesn't consume your roll
    return;
  }
  player.position = pos;
  log(player.name+' used "'+pending.card.name+'" to warp to '+SPACES[pos].name+'.');
  state.preRollAction = true; // playing a card doesn't consume your roll
  resolveLanding(player);
}

// Pure position move — no passedGo money, no markFreeParkingProgress, and
// deliberately never calls resolveLanding, so teleporting someone onto
// e.g. Free Parking or GO doesn't also trigger that space's payout.
function chooseTeleportOtherDestination(pos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'teleportother') return;
  const target = state.players[pending.targetId];
  target.position = pos;
  log(player.name+' used "'+pending.card.name+'" to teleport '+target.name+' to '+SPACES[pos].name+' — no landing effect triggers.');
  if(target.id !== player.id) notify(target, player.name+' teleported you to '+SPACES[pos].name+' with "'+pending.card.name+'" — no landing effect applies.');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function chooseHalfChoosingValue(value){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'halfchoosing') return;
  if(value < 1 || value > 6) return;
  const target = state.players[pending.targetId];
  target.halfChoosingValue = value;
  log(player.name+' used "'+pending.card.name+'" — '+target.name+"'s next roll has one die fixed at "+value+'.');
  notify(target, player.name+' set one of your next roll\'s dice to '+value+' with "'+pending.card.name+'".');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function flipCoinsForSlow(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;
  const target = state.players[pending.targetId];
  // Lucky Duck flipping this: minimize their own penalty if self-targeted,
  // maximize it against an opponent — either way it favors the flipper.
  const favor = (target.id === player.id) ? 'H' : 'T';
  const flips = [0,1,2,3].map(() => flipCoin(player, favor));
  const tailsCount = flips.filter(f=>f==='T').length;
  const penalty = -5 * tailsCount;
  applyRollBoost(target, penalty);
  pending.flips = flips;
  pending.tailsCount = tailsCount;
  pending.penalty = penalty;
  log(player.name+' flipped for "'+pending.card.name+'" targeting '+target.name+': '+flips.join(', ')+' ('+tailsCount+' tails, '+penalty+' to next roll).');
  if(target.id !== player.id && penalty !== 0) notify(target, player.name+' used "'+pending.card.name+'" on you — '+penalty+' to your next roll.');
  state.phase = 'slowflips-result';
}

function resolveSlowFlipsOutcome(){
  if(state.phase !== 'slowflips-result') return;
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function chooseTheftTarget(pos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'propertytheft') return;
  if(player.owned.length === 0){
    log(player.name+' has nothing eligible to give back — the theft falls through.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
    return;
  }
  pending.stealPos = pos;
  state.phase = 'choosing-theft-giveback';
}

function chooseTheftGiveback(givePos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'propertytheft') return;
  if(!player.owned.includes(givePos)) return;

  const stealPos = pending.stealPos;
  const owner = findOwner(stealPos);

  liquidateHousesBeforeTransfer(player, givePos);
  player.owned = player.owned.filter(p => p !== givePos);
  const giveMortgaged = !!player.mortgaged[givePos];
  delete player.mortgaged[givePos];

  if(owner){
    liquidateHousesBeforeTransfer(owner, stealPos);
    owner.owned = owner.owned.filter(p => p !== stealPos);
    const stealMortgaged = !!owner.mortgaged[stealPos];
    delete owner.mortgaged[stealPos];
    owner.owned.push(givePos);
    if(giveMortgaged) owner.mortgaged[givePos] = true;
    player.owned.push(stealPos);
    if(stealMortgaged) player.mortgaged[stealPos] = true;
    log(player.name+' stole '+SPACES[stealPos].name+' from '+owner.name+' in exchange for '+SPACES[givePos].name+'.');
    checkBuilderBonus(owner);
  } else {
    player.owned.push(stealPos);
    log(player.name+' claimed '+SPACES[stealPos].name+' from the bank, giving up '+SPACES[givePos].name+' in return.');
  }
  checkBuilderBonus(player);

  state.pendingCardPlay = null;
  state.phase = 'turn-over';
}

function flipCoinsForCustom(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'custom') return;
  const flips = [0,1].map(() => flipCoin(player, 'H'));
  const headsCount = flips.filter(f=>f==='H').length;
  pending.flips = flips;
  pending.headsCount = headsCount;
  log(player.name+' flipped for "'+pending.card.name+'": '+flips.join(', ')+' ('+headsCount+' heads).');
  if(headsCount === 0){
    state.phase = 'custom-result-none';
    return;
  }
  pending.diceToChoose = headsCount;
  state.phase = 'choosing-custom-dice';
}

function resolveCustomNoEffect(){
  if(state.phase !== 'custom-result-none') return;
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function chooseCustomDiceValues(vals){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'custom') return;
  if(pending.diceToChoose === 1){
    player.forcedDice = { d1: vals[0], d2: null };
  } else {
    player.forcedDice = { d1: vals[0], d2: vals[1] };
  }
  log(player.name+' set up "'+pending.card.name+'" for the next roll.');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function chooseTaxationDestination(pos){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;
  const target = state.players[pending.targetId];
  advanceTo(target, pos, true);
  log(player.name+' used "'+pending.card.name+'" to send '+target.name+' to '+SPACES[pos].name+'.');
  if(target.id !== player.id) notify(target, player.name+' sent you to '+SPACES[pos].name+' with "'+pending.card.name+'".');
  state.pendingCardPlay = null;
  state.preRollAction = true; // playing a card doesn't consume your roll
  resolveLanding(target);
}

function flipCoinsForBonus(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;
  pending.flips = [0,1,2].map(()=> flipCoin(player, 'H'));
  pending.headsCount = pending.flips.filter(f=>f==='H').length;
  log(player.name+' flipped: '+pending.flips.join(', ')+' ('+pending.headsCount+' heads).');
}

function chooseSpeedFlipBonus(n){
  const player = currentPlayer();
  const bonus = 5 * n;
  player.rollBonus += bonus;
  log(player.name+' applies +'+bonus+' to their roll from Speed Flips.');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function flipCoinsForDriveByCoin(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'drivebycoin') return;
  const flips = [0,1,2,3].map(() => flipCoin(player, 'H'));
  const headsCount = flips.filter(f=>f==='H').length;
  pending.flips = flips;
  pending.headsCount = headsCount;
  log(player.name+' flipped for "'+pending.card.name+'": '+flips.join(', ')+' ('+headsCount+' heads).');
  state.phase = 'drivebycoin-result';
}

function resolveDriveByCoinOutcome(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'drivebycoin') return;
  const amount = pending.headsCount * 100;
  if(amount > 0){
    player.driveByActive = amount; // reuses the same "consumed on next roll" mechanic as the flat Drive By cards
    log(player.name+' will steal $'+amount+' from every player they pass this turn.');
  } else {
    log('No heads — "'+pending.card.name+'" has no effect this turn.');
  }
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function flipCoinsForCurse(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;
  pending.flips = [0,1,2].map(()=> flipCoin(player, 'H'));
  pending.headsCount = pending.flips.filter(f=>f==='H').length;
  log(player.name+' flipped: '+pending.flips.join(', ')+' ('+pending.headsCount+' heads).');
  state.phase = 'curse-result';
}

function flipCoinsForGamblingNight(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'gamblingnight') return;
  pending.flips = [0,1,2].map(()=> flipCoin(player, 'H'));
  pending.headsCount = pending.flips.filter(f=>f==='H').length;
  log(player.name+' flipped for "'+pending.card.name+'": '+pending.flips.join(', ')+' ('+pending.headsCount+' heads).');
  state.phase = 'gamblingnight-result';
}

// 0 heads (3 tails) is the special case: the card user alone pays $200
// into the pot. Otherwise every OTHER active player pays $100 per heads.
// Contributions are capped at what each player actually has — nobody
// goes negative or bankrupt from paying into this pot. One random active
// player (the card user included) wins the whole thing.
function resolveGamblingNightOutcome(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending || pending.card.type !== 'gamblingnight') return;
  const headsCount = pending.headsCount;
  const activePlayers = state.players.filter(p=>!p.bankrupt);
  let potTotal = 0;
  if(headsCount === 0){
    const contribution = Math.min(200, player.money);
    player.money -= contribution;
    potTotal += contribution;
    log(player.name+' rolled 3 tails — puts $'+contribution+' into the pot alone.');
  } else {
    const amountEach = headsCount * 100;
    activePlayers.filter(p=>p.id!==player.id).forEach(p=>{
      const contribution = Math.min(amountEach, p.money);
      p.money -= contribution;
      potTotal += contribution;
    });
    log(headsCount+' heads — every other player puts up to $'+amountEach+' each into the pot ($'+potTotal+' total).');
  }
  const winner = activePlayers[Math.floor(Math.random()*activePlayers.length)];
  creditPlayer(winner, potTotal, 'Gambling Night pot');
  log(winner.name+' wins the $'+potTotal+' pot from Gambling Night!');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function resolveCurseOutcome(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;

  if(pending.headsCount === 3){
    player.money += 1000;
    log(player.name+' hit 3 heads on Gambler\'s Curse and wins $1000!');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
  } else if(pending.headsCount === 0){
    const others = state.players.filter(p=>p.id!==player.id && !p.bankrupt);
    if(others.length === 0){
      player.money -= 500;
      state.freeParkingPot += 500;
      log(player.name+' hit 3 tails but there\'s no one to pay — $500 goes to the Free Parking pot instead.');
      state.pendingCardPlay = null;
      state.phase = 'pre-roll';
    } else {
      log(player.name+' hit 3 tails on Gambler\'s Curse — must distribute $500 to the other players.');
      state.phase = 'distributing-curse';
    }
  } else {
    log(player.name+' flipped a mix — no effect this time.');
    state.pendingCardPlay = null;
    state.phase = 'pre-roll';
  }
}

function distributeCurseLoss(amounts){
  const player = currentPlayer();
  const others = state.players.filter(p=>p.id!==player.id && !p.bankrupt);
  let total = 0;
  others.forEach(p=>{ total += (amounts[p.id]||0); });
  if(total !== 500){
    log('Distribution must add up to exactly $500 (currently $'+total+').');
    return;
  }
  player.money -= 500;
  others.forEach(p=>{ creditPlayer(p, amounts[p.id], "Gambler's Curse payout"); });
  log(player.name+' distributed the $500 loss: '+others.map(p=>p.name+' $'+amounts[p.id]).join(', ')+'.');
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function flipCoinsForSteal(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;
  const numCoins = player.owned.filter(pos => !player.mortgaged[pos]).length;
  const flips = Array.from({length:numCoins}, () => flipCoin(player, 'H'));
  const headsCount = flips.filter(f=>f==='H').length;
  pending.flips = flips;
  pending.headsCount = headsCount;
  log(player.name+' flipped '+numCoins+' coin(s) for Coin Flip Steal: '+(flips.join(', ')||'(no properties to flip for)')+' — '+headsCount+' heads.');
  state.phase = 'coinsteal-result';
}

function resolveCoinStealOutcome(){
  const player = currentPlayer();
  const pending = state.pendingCardPlay;
  if(!pending) return;
  const amountEach = pending.headsCount * 50;
  if(amountEach > 0){
    const others = state.players.filter(p => p.id!==player.id && !p.bankrupt && !p.inJail);
    others.forEach(p=>{
      p.money -= amountEach;
      creditPlayer(player, amountEach, 'Coin Flip Steal');
    });
    log(player.name+' collected $'+amountEach+' each from '+(others.map(p=>p.name).join(', ')||'no one')+' via Coin Flip Steal.');
    others.forEach(p=>checkBankrupt(p));
  } else {
    log('Coin Flip Steal had no effect this time.');
  }
  state.pendingCardPlay = null;
  state.phase = 'pre-roll';
}

function resolveTeleportLanding(player, pos){
  const space = SPACES[pos];
  const owner = findOwner(pos);
  if(!owner){
    state.phase = 'awaiting-buy';
    state.pendingSpace = pos;
    state.buyDiscount = true;
  } else if(owner !== player){
    if(owner.mortgaged[pos]){
      state.phase = 'awaiting-steal';
      state.pendingSpace = pos;
      state.pendingStealFrom = owner.id;
    } else {
      payHalfRent(player, owner, space);
      finalizeLandingPhase();
    }
  } else {
    log(player.name+' already owns '+space.name+'.');
    finalizeLandingPhase();
  }
}

function payHalfRent(payer, owner, space){
  if(payer.skipRentActive){
    payer.skipRentActive = false;
    log(payer.name+' skipped rent using Toll Skip!');
    return;
  }
  if(owner.inJail){
    log(owner.name+' is in jail and cannot collect rent right now.');
    return;
  }
  const pos = SPACES.indexOf(space);
  let rent;
  if(space.type === 'property'){
    rent = effectivePropertyRent(owner, pos, space);
  } else if(space.type === 'railroad'){
    const ownedCount = owner.owned.filter(p => SPACES[p].type==='railroad').length;
    rent = RAILROAD_RENT[ownedCount-1];
  } else { // utility
    const ownedCount = owner.owned.filter(p => SPACES[p].type==='utility').length;
    const d1 = 1+Math.floor(Math.random()*6);
    const d2 = 1+Math.floor(Math.random()*6);
    const multiplier = ownedCount >= 2 ? 10 : 4;
    rent = (d1+d2) * multiplier;
    log(payer.name+' threw '+d1+' + '+d2+' for the utility rent calculation.');
  }
  rent = Math.ceil(rent / 2);
  if(owner.rentMultiplierActive){
    rent *= 2;
    owner.rentMultiplierActive = false;
    log('(Double Toll was active — rent doubled!)');
  }

  const beforeAbilityRent = rent;
  rent = applyRentAbilities(payer, owner, rent);
  logRentAbilityNote(payer, owner, beforeAbilityRent, rent);

  payer.money -= rent;
  creditPlayer(owner, rent, 'rent');
  log(payer.name+' paid half rent of $'+rent+' to '+owner.name+' (warp card).');
  checkBankrupt(payer, owner);
}

function markFreeParkingProgress(player, fromPos, toPos, steps, dir){
  dir = dir || 1;
  if(typeof steps === 'number' && steps > 0){
    for(let i=1;i<=steps;i++){
      const pos = dir>0 ? (fromPos+i)%40 : ((fromPos-i)%40+40)%40;
      if(pos === 20){ player.reachedFreeParking = true; return; }
    }
  }
  if(toPos === 20){ player.reachedFreeParking = true; }
}

function countChanceChestPassed(fromPos, steps){
  let count = 0;
  for(let i=1;i<=steps;i++){
    const t = SPACES[(fromPos+i)%40].type;
    if(t==='chance' || t==='chest') count++;
  }
  return count;
}

// Currently-up-for-grabs positions passed over or landed on while moving
// `steps` spaces from fromPos in direction `dir` (1 forward, -1 backward).
// Excludes the final landing spot on purpose — landing directly on an
// up-for-grabs property is just a normal purchase (unowned == unowned,
// unlimited), handled by the regular awaiting-buy flow. Only properties
// passed THROUGH without stopping go through the once-per-turn offer.
function upForGrabsPassed(fromPos, steps, dir){
  const passed = [];
  for(let i=1;i<steps;i++){
    const pos = dir>0 ? (fromPos+i)%40 : ((fromPos-i)%40+40)%40;
    if(state.upForGrabs.includes(pos)) passed.push(pos);
  }
  return passed;
}

// All positions visited during a move, INCLUDING both the starting and
// ending space — unlike upForGrabsPassed above, which excludes both
// endpoints. Used by Drive By / Pass By, where starting or ending on a
// space counts as "passing" it.
function positionsInPath(fromPos, steps, dir){
  const positions = [];
  for(let i=0;i<=steps;i++){
    positions.push(dir>0 ? (fromPos+i)%40 : ((fromPos-i)%40+40)%40);
  }
  return positions;
}

// Pauses movement resolution to offer buying one up-for-grabs property, if
// there's at least one passed and the player hasn't already used their
// once-per-turn purchase. Returns true if it paused (caller should return).
function offerUpForGrabsIfAny(player, positions, extra){
  if(player.upForGrabsBoughtThisTurn || positions.length === 0) return false;
  state.pendingUpForGrabs = Object.assign({ positions }, extra);
  state.phase = 'upforgrabs-choice';
  return true;
}

function chooseUpForGrabsProperty(pos){
  const player = currentPlayer();
  const pending = state.pendingUpForGrabs;
  if(!pending) return;
  if(pos !== null){
    if(!pending.positions.includes(pos) || !state.upForGrabs.includes(pos)) return;
    const space = SPACES[pos];
    if(player.money < space.price){ log(player.name+" can't afford "+space.name+"."); return; }
    player.money -= space.price;
    player.owned.push(pos);
    state.upForGrabs = state.upForGrabs.filter(p=>p!==pos);
    player.upForGrabsBoughtThisTurn = true;
    log(player.name+' bought up-for-grabs '+space.name+' for $'+space.price+'.');
    checkBuilderBonus(player);
  }
  state.pendingUpForGrabs = null;
  if(pending.jailBreak){
    resolveLanding(player);
  } else {
    finishMovementFlow(player, pending);
  }
}

function skipUpForGrabs(){
  const pending = state.pendingUpForGrabs;
  if(!pending) return;
  const player = currentPlayer();
  state.pendingUpForGrabs = null;
  if(pending.jailBreak){
    resolveLanding(player);
  } else {
    finishMovementFlow(player, pending);
  }
}

// Shared movement tail used by rollDice: handles the Small Moves pause (if
// still armed) then lands, then grants the doubles re-roll bonus.
function finishMovementFlow(player, pending){
  const isDouble = pending.isDouble;
  if(player.smallMoveDir != null){
    state.pendingSmallMoveIsDouble = isDouble;
    state.pendingSmallMoveKnockback = pending.knockback || null;
    state.phase = 'confirm-small-move';
    return;
  }
  resolveLanding(player);
  // The card-user's own landing resolves first; only then do Knockback/Knock
  // Forward apply to whoever they passed, per the requested order of
  // operations. Effects on those other players never pause for input (see
  // resolveKnockLanding) since there's no way to interrupt the mover's own
  // turn to collect a decision from a non-current player.
  if(pending.knockback) applyKnockbackEffect(player, pending.knockback);

  // Extension grants the same "roll again" bonus as doubles, without
  // counting toward doublesStreak (the 3-in-a-row jail penalty, which is
  // computed solely from the actual dice in rollDice — untouched here). If
  // the player ALSO rolled real doubles this turn, the natural bonus
  // already covers it, so the charge is deliberately left untouched
  // (pushed back to a later, non-doubles roll) instead of being consumed
  // twice. sendToJail() voids any pending charge outright if this landing
  // sends them to jail.
  let extensionUsed = false;
  if(!isDouble && !player.inJail && (player.extensionActive||0) > 0){
    player.extensionActive -= 1;
    extensionUsed = true;
  }

  state.doubleBonus = (isDouble || extensionUsed) && !player.inJail;
  if(state.doubleBonus){
    player.turnsElapsed = (player.turnsElapsed||0) + 1;
    player.cardsPlayedThisTurn = 0;
    player.upForGrabsBoughtThisTurn = false;
    log(extensionUsed ? (player.name+' uses an Extension to take another turn!') : (player.name+' rolled doubles and gets to roll again!'));
  }
}

// Lucky Duck: any coin flip the ability holder personally triggers resolves
// favorably for them, whether that flip helps them directly or lets them
// squeeze an opponent. favorSide is the 'H'/'T' that benefits flippingPlayer.
function flipCoin(flippingPlayer, favorSide){
  if(flippingPlayer && hasAbility(flippingPlayer,'luckyduck')) return favorSide;
  return Math.random() < 0.5 ? 'H' : 'T';
}

// Greedy Landlord (owner) and Coupon Clipper (payer) act on whatever rent
// amount has already been computed by everything else (Pass By's
// percentage, half-rent cards, Hard Hitter's double, Double Toll) — that
// current amount is the "base rent" their own thresholds look at. If the
// owner has Greedy Landlord AND the payer has Coupon Clipper, they cancel
// each other out entirely and the payer pays whatever that amount already
// was, unmodified by either ability.
function applyRentAbilities(payer, owner, rent){
  const landlord = hasAbility(owner,'greedylandlord');
  const clipper = hasAbility(payer,'couponclipper');
  if(landlord && clipper) return rent;
  if(landlord){
    if(rent < 100) return 100;
    if(rent <= 650) return Math.round(rent * 1.5);
    if(rent <= 1000) return Math.round(rent * 1.35);
    return Math.round(rent * 1.25);
  }
  if(clipper){
    if(rent <= 100) return 0;
    if(rent <= 650) return Math.round(rent * 0.5);
    if(rent <= 1000) return Math.round(rent * 0.65);
    return Math.round(rent * 0.75);
  }
  return rent;
}

function logRentAbilityNote(payer, owner, before, after){
  if(hasAbility(owner,'greedylandlord') && hasAbility(payer,'couponclipper')){
    log('(Greedy Landlord and Coupon Clipper cancel out — normal rent applies.)');
  } else if(hasAbility(owner,'greedylandlord') && after !== before){
    log('(Greedy Landlord bumped the rent from $'+before+' to $'+after+'.)');
  } else if(hasAbility(payer,'couponclipper') && after !== before){
    log('(Coupon Clipper cut the rent from $'+before+' to $'+after+'.)');
  }
}

// Every ability this player could still legally receive: disabled-by-ruleset
// abilities are always excluded; beyond that, allowRepeatAbilities decides
// whether "already claimed" means "claimed by anyone" (false, the original
// behavior) or just "already on this specific player" (true).
function computeAbilityPool(player){
  const disabled = state.ruleset.disabledAbilityIds;
  let pool = ABILITY_DEFS.filter(a=>!disabled.includes(a.id));
  if(state.ruleset.allowRepeatAbilities){
    pool = pool.filter(a=>!player.abilities.includes(a.id));
  } else {
    const takenByAnyone = new Set(state.players.flatMap(p=>p.abilities));
    pool = pool.filter(a=>!takenByAnyone.has(a.id));
  }
  return pool;
}

// Actually hands over one ability — shared by both the 'random' mode's
// immediate grant and 'choice' mode's resolved pick (see chooseGoAbility).
function grantSpecificAbility(player, abilityDef){
  player.abilities.push(abilityDef.id);
  if(abilityDef.id === 'officer'){
    // Income Tax and Luxury Tax become the Officer's own properties —
    // landing on them pays the Officer instead of the Free Parking pot.
    [4, 38].forEach(pos=>{
      const prevOwner = findOwner(pos);
      if(prevOwner) prevOwner.owned = prevOwner.owned.filter(p=>p!==pos);
      player.owned.push(pos);
    });
  }
  log(player.name+' was granted the ability "'+abilityDef.name+'"!');
  notify(player, 'You were granted an ability: '+abilityDef.name+'. '+abilityDef.desc);
}

// The single choke point for "does this GO pass grant an ability or draw a
// card" — replaces the old one-ability-ever assignRandomAbility. Respects
// the ruleset's maxAbilitiesPerPlayer (still 1 by default, reproducing the
// exact original behavior), abilityMode ('random' grants immediately,
// 'choice' pauses the turn via state.pendingGoAbilityChoice — see
// resolvePendingGoChoicePhase/chooseGoAbility), and allowRepeatAbilities
// (via computeAbilityPool).
function grantGoReward(player){
  if(player.abilities.length >= state.ruleset.maxAbilitiesPerPlayer){
    drawCardIfRoom(player);
    return;
  }
  const pool = computeAbilityPool(player);
  if(pool.length === 0){
    // Every legal ability is already claimed (only possible with more
    // players/abilities-per-player than the pool allows) — never hand out
    // an illegal duplicate, just skip the grant.
    log(player.name+' passed GO, but no abilities are available to grant right now.');
    return;
  }
  if(state.ruleset.abilityMode === 'choice' && pool.length > 1){
    const shuffled = shuffle(pool.slice());
    const choices = shuffled.slice(0, Math.min(state.ruleset.choiceCount, pool.length)).map(a=>a.id);
    state.pendingGoAbilityChoice = { playerId: player.id, choices, resumePhase: null };
    log(player.name+' passed GO — choose an ability!');
    notify(player, 'Pick one of '+choices.length+' abilities offered for passing GO.');
    return;
  }
  // 'random' mode, or 'choice' mode with only one legal option left (nothing
  // to actually choose between) — grant immediately, same as random mode.
  const chosen = pool[Math.floor(Math.random()*pool.length)];
  grantSpecificAbility(player, chosen);
}

// Called by chooseGoAbility once a player resolves a pending choice, and by
// settleLandingPhase/the two "landed exactly on GO via a card" branches
// instead of setting state.phase directly — so a choice-mode grant can
// override whatever phase the turn would otherwise settle into, and get
// restored once the player actually picks (see chooseGoAbility).
function resolvePendingGoChoicePhase(fallbackPhase){
  const goChoice = state.pendingGoAbilityChoice;
  if(goChoice){
    goChoice.resumePhase = fallbackPhase;
    return 'choosing-go-ability';
  }
  return fallbackPhase;
}

function chooseGoAbility(abilityId){
  const goChoice = state.pendingGoAbilityChoice;
  if(!goChoice || state.phase !== 'choosing-go-ability') return;
  if(!goChoice.choices.includes(abilityId)) return;
  const player = state.players[goChoice.playerId];
  const abilityDef = ABILITY_DEFS.find(a=>a.id===abilityId);
  grantSpecificAbility(player, abilityDef);
  state.pendingGoAbilityChoice = null;
  state.phase = goChoice.resumePhase;
}

function awardPassingGoMoney(player){
  if(state.suddenDeath){
    log(player.name+' passed GO, but Sudden Death means no payout.');
    return;
  }
  player.money += 200;
  log(player.name+' passed GO, collected $200.');
}

// Only used for the player's own dice roll, and for hand-card-driven
// teleports the player deliberately chose to play (see advanceTo's
// awardAbility param) — card-driven moves that are an automatic side
// effect of an already-drawn card (Chance/Chest "Advance to GO", etc.)
// still pay the $200 but don't also trigger this grant, or landing on
// Chance/Chest + drawing an "Advance to GO" card would double-grant in
// one turn. Grants an ability (random or choice, per the ruleset) until
// the player hits maxAbilitiesPerPlayer; every pass after that draws a
// card instead.
function awardPassingGoWithCard(player){
  awardPassingGoMoney(player);
  grantGoReward(player);
}

function rollDice(){
  const player = currentPlayer();
  if(state.phase !== 'pre-roll') return;
  if(player.skipRollActive) return; // must call skipRoll() instead this turn
  state.rollLandingPos = null; // set below, right after the roll's own movement — see the client's animation diff

  // Diced/Cursed Die can set this to 1 or 3 for just this roll; normal play
  // is always 2, unless High Roller makes 3 the baseline.
  const diceCount = player.diceCountOverride || (hasAbility(player,'highroller') ? 3 : 2);
  player.diceCountOverride = null;

  let dice;
  if(diceCount === 2 && player.forcedDice){
    const d1 = player.forcedDice.d1 != null ? player.forcedDice.d1 : 1+Math.floor(Math.random()*6);
    const d2 = player.forcedDice.d2 != null ? player.forcedDice.d2 : 1+Math.floor(Math.random()*6);
    dice = [d1, d2];
    log(player.name+' used Custom to set up this roll.');
    player.forcedDice = null;
    player.halfChoosingValue = null; // a real Custom roll always overrides any pending Half Choosing
  } else if(player.halfChoosingValue != null){
    player.forcedDice = null;
    dice = Array.from({length: diceCount}, () => 1+Math.floor(Math.random()*6));
    dice[0] = player.halfChoosingValue;
    log(player.name+"'s first die is fixed at "+dice[0]+' from Half Choosing.');
    player.halfChoosingValue = null;
  } else {
    player.forcedDice = null; // a non-2 dice count makes any pending Custom setup meaningless — drop it
    dice = Array.from({length: diceCount}, () => 1+Math.floor(Math.random()*6));
  }

  const counts = {};
  dice.forEach(d => { counts[d] = (counts[d]||0)+1; });
  const maxSameCount = Math.max(...Object.values(counts));
  const isDouble = diceCount >= 2 && maxSameCount >= 2;
  const isTriple = diceCount === 3 && maxSameCount === 3;
  state.lastDice = dice;
  // High Roller: a triple resets the streak (rewarding the rare triple)
  // instead of extending it toward the 3-in-a-row threshold below.
  if(isTriple && hasAbility(player,'highroller')){
    state.doublesStreak = 0;
  } else {
    state.doublesStreak = isDouble ? (state.doublesStreak||0)+1 : 0;
  }

  // Gambling Luck is only playable right after rolling two 1s, before the
  // next roll recalculates this. Nudge the player if they're actually
  // holding the card, since it's easy to forget to play it in time.
  player.rolledDoubleOnesActive = (diceCount === 2 && dice[0] === 1 && dice[1] === 1);
  if(player.rolledDoubleOnesActive && player.hand.some(c=>c.type==='gamblingluck')){
    notify(player, 'You rolled two 1s! You can play "Gambling Luck" for $1000 before your next roll.');
  }

  if(isDouble && state.doublesStreak >= 3){
    if(hasAbility(player,'highroller')){
      log(player.name+' rolled doubles three times in a row — High Roller keeps them out of Jail, but their turn ends.');
    } else {
      log(player.name+' rolled doubles three times in a row — straight to Jail!');
      sendToJail(player);
    }
    state.doublesStreak = 0;
    state.doubleBonus = false;
    state.phase = 'turn-over';
    return;
  }

  let total = dice.reduce((a,b)=>a+b,0) + player.rollBonus;
  if(player.rollBonus>0){
    log(player.name+' rolled '+dice.join(' + ')+' + card bonus '+player.rollBonus+' = '+total+'.'+(isDouble?' Doubles!':''));
  } else {
    log(player.name+' rolled '+dice.join(' + ')+' = '+total+'.'+(isDouble?' Doubles!':''));
  }
  player.rollBonus = 0; // bonus is consumed on use

  if(isTriple){
    player.money += 500;
    log(player.name+' rolled triples! Bonus $500.');
  }

  // Wrong Way flips movement backward for this roll only. Moving backward
  // never awards GO money/a card just for passing through GO — only
  // landing exactly on GO still does (handled below via the same passedGo
  // flag/awardPassingGoWithCard path as a normal forward landing on GO).
  let dir = 1;
  if(player.wrongWayActive){
    dir = -1;
    player.wrongWayActive = false;
    log(player.name+' is going the Wrong Way this turn — moving backwards!');
  }

  // A big enough negative rollBonus (Slow-family cards) can push the total
  // below zero even without Wrong Way active — fold that sign into `dir` so
  // everything downstream (movement, GO-passing, Drive By, Pass By,
  // Pickup) always sees a non-negative distance and one true direction,
  // instead of silently computing an invalid negative board position via
  // JS's sign-preserving modulo.
  if(total < 0){
    dir = -dir;
    total = -total;
  }

  const fromPos = player.position;
  const conductorTriggered = player.conductorActive && dir > 0;
  player.conductorActive = false; // consumed on this roll regardless of direction
  // One at a Time replaces the whole-roll movement with a chain of
  // individual per-die moves (see beginOneAtATimeSequence near the end of
  // this function) — deliberately does NOT move player.position here, so
  // the per-die sequence starts from the real fromPos instead of double-
  // applying the full total on top of an already-completed move.
  const oneAtATimeTriggered = player.oneAtATimeActive && !conductorTriggered;
  let passedGo = false;
  if(conductorTriggered){
    passedGo = applyConductorMove(player, fromPos, total);
    log(player.name+' used Conductor — redirected through the railroads to '+SPACES[player.position].name+'.');
  } else if(oneAtATimeTriggered){
    // movement deferred entirely to the per-die sequence below
  } else if(dir > 0){
    passedGo = (fromPos + total) >= 40;
    player.position = (fromPos + total) % 40;
  } else {
    player.position = ((fromPos - total) % 40 + 40) % 40;
    passedGo = (player.position === 0);
  }
  // The space the roll itself actually walked to, before anything a
  // landing there triggers (a Chance/Chest card's own "Advance to X", the
  // GO $400-vs-teleport choice, etc.) can move the player again. The
  // client walks the token here step-by-step, then — if a later teleport
  // moves them further this same turn — just snaps straight to the real
  // final spot instead of animating that hop too (same checkpoint hotseat
  // already uses for its own local animation).
  state.rollLandingPos = player.position;
  if(!oneAtATimeTriggered){
    markFreeParkingProgress(player, fromPos, player.position, total, dir);
  }
  if(passedGo){
    awardPassingGoWithCard(player);
  }

  if(player.driveByActive){
    const amount = player.driveByActive;
    player.driveByActive = null;
    const passedPositions = positionsInPath(fromPos, total, dir);
    const victims = state.players.filter(p => p.id !== player.id && !p.bankrupt && !p.inJail && passedPositions.includes(p.position));
    if(victims.length > 0){
      victims.forEach(v=>{ v.money -= amount; creditPlayer(player, amount, 'Drive By'); });
      log(player.name+' drove by and stole $'+amount+' each from '+victims.map(v=>v.name).join(', ')+'.');
      victims.forEach(v=>checkBankrupt(v));
    } else {
      log(player.name+' drove by but passed no one this turn.');
    }
  }
  resolvePassByTraps(player, fromPos, total, dir);

  if(player.passByRemixActive !== null){
    const giver = state.players[player.passByRemixActive];
    player.passByRemixActive = null;
    if(giver && !giver.bankrupt){
      const interior = positionsInPath(fromPos, total, dir).slice(1, -1);
      const ownedPassed = interior.filter(pos => giver.owned.includes(pos));
      if(ownedPassed.length > 0){
        const amount = ownedPassed.length * 100;
        player.money -= amount;
        creditPlayer(giver, amount, 'Pass By Remix');
        log(player.name+' passed '+ownedPassed.length+' of '+giver.name+"'s propert"+(ownedPassed.length>1?'ies':'y')+' and paid them $'+amount+' (Pass By Remix).');
        checkBankrupt(player, giver);
      }
    }
  }

  let knockback = null;
  if(player.knockDeltaActive){
    const delta = player.knockDeltaActive;
    player.knockDeltaActive = null;
    knockback = { delta, passedPositions: positionsInPath(fromPos, total, dir) };
  }

  if(player.pickupActive){
    const passedCount = dir>0 ? countChanceChestPassed(fromPos, total) : 0;
    if(passedCount > 0){
      for(let i=0;i<passedCount;i++) drawCardIfRoom(player);
      log(player.name+' picked up '+passedCount+' card(s) from Pickup while passing Chance/Community Chest.');
    }
    player.pickupActive = false;
  }

  // One at a Time replaces the single whole-roll movement with a chain of
  // individual per-die moves+landings (see beginOneAtATimeSequence). Skips
  // the up-for-grabs offer and Small Moves pause for this roll — both are
  // "whole roll path" concepts that don't cleanly apply once the roll is
  // split into separate movements. Conductor takes priority if it also
  // triggered this roll, since its redirected path is already a single
  // resolved position, not a per-die sequence.
  if(oneAtATimeTriggered){
    const diceValues = dice.slice();
    diceValues[0] += (total - dice.reduce((a,b)=>a+b,0)); // fold any rollBonus into the first die
    beginOneAtATimeSequence(player, diceValues, dir, isDouble, knockback);
    return;
  }

  const grabbable = upForGrabsPassed(fromPos, total, dir);
  if(offerUpForGrabsIfAny(player, grabbable, {isDouble, knockback})) return;

  finishMovementFlow(player, {isDouble, knockback});
}

function confirmSmallMove(useIt){
  const player = currentPlayer();
  const dir = player.smallMoveDir;
  player.smallMoveDir = null;
  if(useIt){
    moveBy(player, dir);
    log(player.name+' used Small Moves to shift 1 space '+(dir>0?'forward':'backward')+' before landing.');
  } else {
    log(player.name+' chose not to use Small Moves this turn.');
  }

  resolveLanding(player);

  const knockback = state.pendingSmallMoveKnockback;
  state.pendingSmallMoveKnockback = null;
  if(knockback) applyKnockbackEffect(player, knockback);

  const isDouble = state.pendingSmallMoveIsDouble;
  state.pendingSmallMoveIsDouble = null;

  let extensionUsed = false;
  if(!isDouble && !player.inJail && (player.extensionActive||0) > 0){
    player.extensionActive -= 1;
    extensionUsed = true;
  }

  state.doubleBonus = (isDouble || extensionUsed) && !player.inJail;
  if(state.doubleBonus){
    player.turnsElapsed = (player.turnsElapsed||0) + 1;
    player.cardsPlayedThisTurn = 0;
    player.upForGrabsBoughtThisTurn = false;
    log(extensionUsed ? (player.name+' uses an Extension to take another turn!') : (player.name+' rolled doubles and gets to roll again!'));
  }
}

function rollAgain(){
  if(!state.doubleBonus) return;
  state.doubleBonus = false;
  state.phase = 'pre-roll';
}

function moveBy(player, delta){
  const fromPos = player.position;
  const newPos = (player.position + delta + 40) % 40;
  if(delta > 0 && newPos < player.position){
    awardPassingGoMoney(player);
  }
  player.position = newPos;
  markFreeParkingProgress(player, fromPos, newPos, delta>0?delta:0);
}

// awardAbility: when true, passing GO here counts the same as a normal
// dice-driven pass (money + first-ever ability, or a card after that) —
// used by hand-card teleports the player deliberately chose to play
// (Buyer, the color Teleport cards, Taxation, Lottery's send-to-Free-
// Parking). Left false (money only, matching the original behavior) for
// the classic Chance/Community Chest "Advance to X" cards, since those
// are an automatic side effect of a landing that already drew its own
// custom-deck card — awarding the ability there too would let one
// landing double-dip.
function advanceTo(player, pos, awardAbility){
  const fromPos = player.position;
  const steps = (pos - fromPos + 40) % 40;
  const passedGo = pos < player.position;
  player.position = pos;
  markFreeParkingProgress(player, fromPos, pos, steps);
  if(passedGo){
    if(awardAbility) awardPassingGoWithCard(player);
    else awardPassingGoMoney(player);
  }
}

function sendToJail(player){
  if(hasAbility(player,'officer')) return; // Officers can never be sent to Jail
  player.position = 10;
  player.inJail = true;
  player.jailTurns = 2;
  player.extensionActive = 0; // any pending Extension charge is voided by going to jail
  // Any remaining un-rolled dice from a One at a Time sequence are voided
  // too — same reasoning as Extension, and matches the existing "jail
  // cancels the rest of a reveal queue" behavior.
  if(state.oneAtATimeQueue && state.oneAtATimeQueue.playerId === player.id){
    state.oneAtATimeQueue = null;
  }
  log(player.name+' was sent to Jail (2 turns).');
}

// Income Tax/Luxury Tax normally go straight to the Free Parking pot, but
// once an Officer has claimed a tax space as their own property, landing
// there pays THEM instead — under the same rules as any other rent
// (Toll Skip, owner-in-jail, Coupon Clipper discount, Greedy Landlord —
// though the "owner" here is always the Officer).
function payTaxOrRent(payer, space){
  const owner = findOwner(player_position_of(space));
  if(!owner){
    payer.money -= space.amount;
    state.freeParkingPot += space.amount;
    log(payer.name+' paid $'+space.amount+' in tax (added to Free Parking pot).');
    return;
  }
  if(owner === payer){
    log(payer.name+' landed on their own '+space.name+' — no tax owed.');
    return;
  }
  if(payer.skipRentActive){
    payer.skipRentActive = false;
    log(payer.name+' skipped rent using Toll Skip!');
    return;
  }
  if(owner.inJail){
    log(owner.name+' is in jail and cannot collect rent right now.');
    return;
  }
  const beforeAbilityRent = space.amount;
  const rent = applyRentAbilities(payer, owner, beforeAbilityRent);
  logRentAbilityNote(payer, owner, beforeAbilityRent, rent);
  payer.money -= rent;
  creditPlayer(owner, rent, 'rent');
  log(payer.name+' paid $'+rent+" to "+owner.name+' for landing on '+space.name+" (Officer's property).");
  checkBankrupt(payer, owner);
}

// Officer: landing on Go To Jail sends a random OTHER player to Jail
// instead of them (they're immune themselves). No-op if no one else is
// still in the game.
function officerGoToJailRedirect(player){
  const others = state.players.filter(p => p.id !== player.id && !p.bankrupt);
  if(others.length === 0) return;
  const victim = others[Math.floor(Math.random()*others.length)];
  sendToJail(victim);
  log(player.name+"'s Officer ability sends "+victim.name+' to Jail instead!');
  notify(victim, player.name+' landed on Go To Jail — as an Officer, they sent you to Jail instead!');
}

// Officer: anyone leaving jail (by rolling doubles or waiting out their
// time) owes them $100 — never charged to the Officer themselves, since
// they can never be sent to jail in the first place.
function chargeJailExitFeeToOfficer(player){
  const officer = state.players.find(p => hasAbility(p,'officer') && !p.bankrupt && p.id !== player.id);
  if(!officer) return;
  player.money -= 100;
  creditPlayer(officer, 100, 'jail exit fee');
  log(player.name+' pays '+officer.name+' $100 for leaving Jail (Officer).');
  checkBankrupt(player, officer);
}

// Chance/Community Chest cards are drawn and applied one at a time, then
// shown with a "Next" button (acknowledgeRevealCard) before the next one
// draws or the turn continues — this makes sure whoever's playing actually
// sees each result rather than it just flashing by in the log. Landing on
// a Chance/Chest space normally uses a queue of length 1; multi-draw cards
// like Pickup Chance/Pickup Both use a longer queue. If a queued card sends
// the player to jail, the rest of the queue is cancelled (see
// acknowledgeRevealCard) rather than continuing to draw.
function startCardReveal(deckTypes, afterPhase){
  if(state.pendingReveal){
    // Already mid-reveal (a card's move landed on another Chance/Chest
    // space) — splice these draws in ahead of the rest of the queue.
    state.pendingReveal.queue.unshift(...deckTypes);
  } else {
    state.pendingReveal = { queue: deckTypes.slice(), afterPhase };
  }
  drawNextRevealCard();
}

function drawNextRevealCard(){
  const pending = state.pendingReveal;
  const player = currentPlayer();
  const deckType = pending.queue.shift();
  const card = drawChanceOrChestCard(deckType);
  const posBefore = player.position;
  log((deckType==='chance'?'Chance':'Community Chest')+' — '+player.name+': '+card.text);
  card.apply(player, state);
  checkBankrupt(player);
  pending.current = { deckType, text: card.text, movedTo: player.position !== posBefore ? player.position : null };
  state.phase = 'revealing-card';
}

// Continues the reveal queue once we're back to a plain 'turn-over' point
// (i.e. no buy/steal/GO decision is still pending) — called both from
// acknowledgeRevealCard directly and from the various decision resolvers
// (buyProperty, skipBuy, etc.) in case a queued card's move triggered one.
function resumeRevealQueueIfPending(){
  const pending = state.pendingReveal;
  if(!pending || state.phase !== 'turn-over') return;
  if(pending.queue.length > 0){
    drawNextRevealCard();
  } else {
    const afterPhase = pending.afterPhase;
    state.pendingReveal = null;
    settleLandingPhase(afterPhase);
  }
}

function acknowledgeRevealCard(){
  const pending = state.pendingReveal;
  if(!pending || state.phase !== 'revealing-card') return;
  const player = currentPlayer();
  const moved = pending.current.movedTo;

  if(player.inJail){
    log(player.name+' was sent to Jail — cancelling the remaining card pickup(s).');
    state.pendingReveal = null;
    state.phase = 'turn-over';
    return;
  }

  if(moved !== null){
    resolveLanding(player); // may draw more (nested Chance/Chest), or pause on a buy/steal/GO decision
    if(player.inJail){
      log(player.name+' was sent to Jail — cancelling the remaining card pickup(s).');
      state.pendingReveal = null;
      state.phase = 'turn-over';
      return;
    }
    resumeRevealQueueIfPending();
    return;
  }

  state.phase = 'turn-over';
  resumeRevealQueueIfPending();
}

function resolveLanding(player){
  const space = SPACES[player.position];
  log(player.name+' landed on '+space.name+'.');

  // Officer: landing on the same space as another player sends THEM to
  // Jail — only when the Officer is the one arriving, never the reverse.
  // Excludes players already serving time (they're not really "sharing"
  // the Jail space, just visiting/serving from position 10).
  if(hasAbility(player,'officer')){
    state.players.filter(p => p.id !== player.id && !p.bankrupt && !p.inJail && p.position === player.position)
      .forEach(other=>{
        sendToJail(other);
        log(player.name+"'s Officer ability sends "+other.name+' to Jail for sharing the space!');
        notify(other, player.name+' landed on your space — as an Officer, they sent you to Jail!');
      });
  }

  // Hard Hitter resolves definitively on the very next landing, of any
  // kind, on the turn it was given — not a "wait until you eventually
  // land on a property" flag like Freelo/Rowdy Guest/Uno Reverse. If this
  // landing doesn't owe rent to anyone, the card is handed back into the
  // player's own hand instead of being discarded.
  let hardHitterDouble = false;
  if(player.hardHitterActive){
    player.hardHitterActive = false;
    const pendingCard = player.hardHitterPendingCard;
    player.hardHitterPendingCard = null;
    const hhOwner = findOwner(player.position);
    const rentDue = (space.type==='property' || space.type==='railroad' || space.type==='utility')
      && hhOwner && hhOwner!==player && !hhOwner.mortgaged[player.position];
    if(rentDue){
      hardHitterDouble = true;
      state.discardPile.push(pendingCard);
    } else if(pendingCard){
      player.hand.push(pendingCard);
      log(player.name+' keeps "'+pendingCard.name+'" — no rent was due on this landing.');
      checkHandTrimming();
    }
  }

  if(space.type === 'property' || space.type === 'railroad' || space.type === 'utility'){
    const owner = findOwner(player.position);
    const freelo = player.freeloActive;
    if(freelo) player.freeloActive = false; // consumed on the next property landed on, buy-it-or-not
    const rowdyGuest = player.rowdyGuestActive;
    if(rowdyGuest) player.rowdyGuestActive = false; // consumed on the next property landed on, houses or not
    const unoReverse = player.unoReverseActive;
    if(unoReverse) player.unoReverseActive = false; // consumed on the next property landed on
    if(!owner){
      if(freelo){
        state.pendingSpace = player.position;
        player.owned.push(player.position);
        checkBuilderBonus(player);
        log(player.name+' got '+space.name+' for free with Freelo!');
        state.phase = 'freelo-free-property';
        return; // wait for the player to acknowledge
      }
      state.phase = 'awaiting-buy';
      state.pendingSpace = player.position;
      return; // wait for buy/skip decision
    } else if(owner !== player){
      if(freelo){
        log(player.name+' used Freelo — no rent owed on '+space.name+'.');
      } else if(rowdyGuest && space.type === 'property' && (owner.houses[player.position]||0) > 0){
        const removed = Math.min(3, owner.houses[player.position]);
        owner.houses[player.position] -= removed;
        log(player.name+' used Rowdy Guest — knocked '+removed+' house(s) off '+space.name+' (down to '+owner.houses[player.position]+').');
        rebalanceGroupAfterKnock(owner, space.color);
        payRent(player, owner, space); // computed after the knock, so it reflects the reduced house count
      } else if(unoReverse){
        payReversedRent(player, owner, space);
      } else if(hardHitterDouble){
        payDoubleRent(player, owner, space);
      } else {
        payRent(player, owner, space);
      }

      // Vampire: steal one house/hotel-level off whatever's left after rent,
      // regardless of which rent path ran above (even Freelo's free rent).
      if(hasAbility(player,'vampire') && !player.bankrupt && (owner.houses[player.position]||0) > 0){
        if(player.owned.length === 0){
          log(player.name+"'s Vampire ability would steal a house from "+space.name+", but they own nothing to put it on.");
        } else {
          owner.houses[player.position] -= 1;
          state.phase = 'vampire-steal-placement';
          state.pendingVampireSteal = { fromName: space.name };
          log(player.name+"'s Vampire ability steals a house off "+space.name+"! Choose one of your own properties to add it to.");
          return; // wait for the player to choose a destination
        }
      }
    } else if(unoReverse){
      payReversedRentToSelf(player, space);
      if(state.phase === 'distributing-unoreverse') return; // wait for the payout split
    }
  } else if(space.type === 'tax'){
    payTaxOrRent(player, space);
  } else if(space.type === 'free'){
    const payout = state.suddenDeath ? 0 : state.freeParkingPot;
    player.money += payout;
    log(state.suddenDeath
      ? player.name+' landed on Free Parking, but Sudden Death means no payout.'
      : player.name+' collected $'+payout+' from Free Parking! The bank restocks the pot with $200.');
    state.freeParkingPot = 200;
    const unowned = unownedPropertyPositions();
    if(unowned.length > 0){
      const givePos = unowned[Math.floor(Math.random()*unowned.length)];
      player.owned.push(givePos);
      checkBuilderBonus(player);
      log(player.name+' also receives '+SPACES[givePos].name+' free from the bank for landing on Free Parking!');
    }
  } else if(space.type === 'gotojail'){
    if(hasAbility(player,'officer')) officerGoToJailRedirect(player);
    else sendToJail(player);
  } else if(space.type === 'chance' || space.type === 'chest'){
    drawCardIfRoom(player); // separate custom-deck draw, unaffected by the reveal flow below
    if(hasAbility(player,'firstrateduelist')) drawCardIfRoom(player); // Double Draw: doubles the deck draw, not the classic Chance/Chest reveal below
    const afterPhase = state.preRollAction ? 'pre-roll' : 'turn-over';
    state.preRollAction = false;
    startCardReveal([space.type], afterPhase);
    return; // the reveal flow finalizes the phase itself, including any nested landing
  } else if(space.type === 'go'){
    state.phase = 'go-bonus-choice';
    return; // wait for the $400-vs-teleport decision
  }

  finalizeLandingPhase();
}

// Auto-resolves a landing caused by Knockback/Knock Forward on someone
// other than the current player. There's no way to pause and collect a
// decision from a non-current player (the same architectural gap noted on
// checkHandTrimming), so anything that would normally need a buy/skip
// decision or a "Next" click is auto-resolved instead: unowned properties
// are left unbought, Chance/Chest cards are drawn and applied immediately,
// and landing exactly on GO just takes the ordinary $200 (no $400-vs-
// teleport choice). Recurses if a drawn Chance/Chest card moves the player
// again (e.g. "Advance to Boardwalk"). Everything is pushed to the
// affected player via notify() so they see it next time it's their turn.
function resolveKnockLanding(victim){
  const space = SPACES[victim.position];
  if(space.type === 'property' || space.type === 'railroad' || space.type === 'utility'){
    const owner = findOwner(victim.position);
    if(!owner){
      notify(victim, 'You got knocked onto '+space.name+' (unowned) — no purchase made.');
    } else if(owner !== victim){
      payRent(victim, owner, space);
      notify(victim, 'You got knocked onto '+space.name+' and paid rent to '+owner.name+'.');
    } else {
      notify(victim, 'You got knocked onto '+space.name+', which you already own.');
    }
  } else if(space.type === 'tax'){
    payTaxOrRent(victim, space);
    notify(victim, 'You got knocked onto '+space.name+' — check the log for what you paid.');
  } else if(space.type === 'free'){
    const payout = state.suddenDeath ? 0 : state.freeParkingPot;
    victim.money += payout;
    log(state.suddenDeath
      ? victim.name+' was knocked onto Free Parking, but Sudden Death means no payout.'
      : victim.name+' was knocked onto Free Parking and collected $'+payout+'!');
    notify(victim, state.suddenDeath ? 'You got knocked onto Free Parking, but Sudden Death means no payout.' : 'You got knocked onto Free Parking and collected $'+payout+'!');
    state.freeParkingPot = 200;
    const unowned = unownedPropertyPositions();
    if(unowned.length > 0){
      const givePos = unowned[Math.floor(Math.random()*unowned.length)];
      victim.owned.push(givePos);
      checkBuilderBonus(victim);
      log(victim.name+' also received '+SPACES[givePos].name+' free from the bank.');
    }
  } else if(space.type === 'gotojail'){
    if(hasAbility(victim,'officer')){
      officerGoToJailRedirect(victim);
    } else {
      sendToJail(victim);
      notify(victim, 'You got knocked onto Go To Jail and were sent to Jail.');
    }
  } else if(space.type === 'chance' || space.type === 'chest'){
    drawCardIfRoom(victim);
    if(hasAbility(victim,'firstrateduelist')) drawCardIfRoom(victim); // Double Draw
    const deckCard = drawChanceOrChestCard(space.type);
    const posBefore = victim.position;
    deckCard.apply(victim, state);
    checkBankrupt(victim);
    log(victim.name+' was knocked onto '+(space.type==='chance'?'Chance':'Community Chest')+' and drew: '+deckCard.text);
    notify(victim, 'You got knocked onto '+(space.type==='chance'?'Chance':'Community Chest')+' and drew: "'+deckCard.text+'"');
    if(victim.position !== posBefore && !victim.inJail){
      resolveKnockLanding(victim); // the card moved them again — resolve that landing too
    }
    return;
  } else if(space.type === 'go'){
    if(state.suddenDeath){
      log(victim.name+' was knocked exactly onto GO, but Sudden Death means no payout.');
      notify(victim, 'You got knocked onto GO, but Sudden Death means no payout.');
    } else {
      victim.money += 200;
      log(victim.name+' was knocked exactly onto GO and collected $200.');
      notify(victim, 'You got knocked onto GO and collected $200.');
    }
  }
  // 'jail' (Just Visiting) needs no handling.
}

function applyKnockbackEffect(mover, knockback){
  const { delta, passedPositions } = knockback;
  const victims = state.players.filter(p => p.id !== mover.id && !p.bankrupt && passedPositions.includes(p.position));
  victims.forEach(victim=>{
    const fromPos = victim.position;
    victim.position = ((fromPos + delta) % 40 + 40) % 40;
    log(mover.name+"'s card knocked "+victim.name+' from '+SPACES[fromPos].name+' to '+SPACES[victim.position].name+'.');
    resolveKnockLanding(victim);
  });
}

function acknowledgeFreeloProperty(){
  if(state.phase !== 'freelo-free-property') return;
  state.pendingSpace = null;
  finalizeLandingPhase();
  resumeRevealQueueIfPending();
}

function takeGoBonusMoney(){
  const player = currentPlayer();
  if(state.phase !== 'go-bonus-choice') return;
  if(state.suddenDeath){
    log(player.name+' — no GO bonus during Sudden Death.');
  } else {
    player.money += 200; // tops up the $200 already collected for reaching GO to $400 total
    log(player.name+' took the GO bonus — $400 total for landing on GO.');
  }
  finalizeLandingPhase();
  resumeRevealQueueIfPending();
}

function chooseGoTeleportOption(){
  if(state.phase !== 'go-bonus-choice') return;
  state.phase = 'go-teleport-destination';
}

function chooseGoTeleportDestination(pos){
  const player = currentPlayer();
  if(state.phase !== 'go-teleport-destination') return;
  if(pos === 0) return; // can't teleport back to GO
  player.position = pos;
  log(player.name+' used the GO teleport to warp to '+SPACES[pos].name+'.');
  resolveLanding(player);
  resumeRevealQueueIfPending();
}

function findOwner(position){
  for(const p of state.players){
    if(p.owned.includes(position)) return p;
  }
  return null;
}

function payRent(payer, owner, space){
  if(payer.skipRentActive){
    payer.skipRentActive = false;
    log(payer.name+' skipped rent using Toll Skip!');
    return;
  }
  if(owner.inJail){
    log(owner.name+' is in jail and cannot collect rent right now.');
    return;
  }
  if(owner.mortgaged[SPACES.indexOf(space)]){
    log(space.name+' is mortgaged — no rent owed.');
    return;
  }

  let rent;
  if(space.type === 'property'){
    rent = effectivePropertyRent(owner, player_position_of(space), space);
  } else if(space.type === 'railroad'){
    const ownedCount = owner.owned.filter(pos => SPACES[pos].type==='railroad').length;
    rent = Math.round(RAILROAD_RENT[ownedCount-1] * nonPropertyHouseMultiplier(owner.houses[player_position_of(space)]||0));
  } else { // utility
    const ownedCount = owner.owned.filter(pos => SPACES[pos].type==='utility').length;
    const d1 = 1+Math.floor(Math.random()*6);
    const d2 = 1+Math.floor(Math.random()*6);
    const multiplier = ownedCount >= 2 ? 10 : 4;
    rent = Math.round((d1+d2) * multiplier * nonPropertyHouseMultiplier(owner.houses[player_position_of(space)]||0));
    log(payer.name+' threw '+d1+' + '+d2+' for the utility rent calculation.');
  }

  if(owner.rentMultiplierActive){
    rent *= 2;
    owner.rentMultiplierActive = false;
    log('(Double Toll was active — rent doubled!)');
  }

  // Rent Thief: redirects this payment to whoever gave the payer the card,
  // as long as that person isn't the actual owner already. Consumed on
  // this landing regardless of whether a redirect actually happened.
  let collector = owner;
  if(payer.rentThiefGiverId != null){
    const giver = state.players.find(p => p.id === payer.rentThiefGiverId);
    payer.rentThiefGiverId = null;
    if(giver && !giver.bankrupt && giver.id !== owner.id){
      collector = giver;
      log('Rent Thief redirects the rent to '+giver.name+' instead of '+owner.name+'!');
      if(owner.id !== payer.id) notify(owner, payer.name+' would have paid you rent, but Rent Thief redirected it to '+giver.name+'.');
    }
  }

  const beforeAbilityRent = rent;
  rent = applyRentAbilities(payer, collector, rent);
  logRentAbilityNote(payer, collector, beforeAbilityRent, rent);

  payer.money -= rent;
  creditPlayer(collector, rent, 'rent');
  log(payer.name+' paid $'+rent+' rent to '+collector.name+'.');
  checkBankrupt(payer, collector);
}

// Hard Hitter's payout — identical to payRent's own skipRentActive/
// owner-in-jail/mortgaged/rent-formula/Double-Toll logic, just doubled at
// the end (stacking with Double Toll if that's also active). Kept as its
// own copy rather than adding a "doubled" parameter to payRent.
function payDoubleRent(payer, owner, space){
  if(payer.skipRentActive){
    payer.skipRentActive = false;
    log(payer.name+' skipped rent using Toll Skip!');
    return;
  }
  if(owner.inJail){
    log(owner.name+' is in jail and cannot collect rent right now.');
    return;
  }
  if(owner.mortgaged[SPACES.indexOf(space)]){
    log(space.name+' is mortgaged — no rent owed.');
    return;
  }

  let rent;
  if(space.type === 'property'){
    rent = effectivePropertyRent(owner, player_position_of(space), space);
  } else if(space.type === 'railroad'){
    const ownedCount = owner.owned.filter(pos => SPACES[pos].type==='railroad').length;
    rent = RAILROAD_RENT[ownedCount-1];
  } else { // utility
    const ownedCount = owner.owned.filter(pos => SPACES[pos].type==='utility').length;
    const d1 = 1+Math.floor(Math.random()*6);
    const d2 = 1+Math.floor(Math.random()*6);
    const multiplier = ownedCount >= 2 ? 10 : 4;
    rent = (d1+d2) * multiplier;
    log(payer.name+' threw '+d1+' + '+d2+' for the utility rent calculation.');
  }

  if(owner.rentMultiplierActive){
    rent *= 2;
    owner.rentMultiplierActive = false;
    log('(Double Toll was active — rent doubled!)');
  }
  rent *= 2; // Hard Hitter

  const beforeAbilityRent = rent;
  rent = applyRentAbilities(payer, owner, rent);
  logRentAbilityNote(payer, owner, beforeAbilityRent, rent);

  payer.money -= rent;
  creditPlayer(owner, rent, 'rent');
  log(payer.name+' paid DOUBLE rent of $'+rent+' to '+owner.name+' (Hard Hitter).');
  checkBankrupt(payer, owner);
}

function player_position_of(space){
  return SPACES.indexOf(space);
}

// After Rowdy Guest knocks houses off one property, the rest of that
// color group might now be more than 1 house ahead of the new minimum,
// violating the even-build rule (buildHouse won't let you build unevenly
// going forward, but doesn't retroactively enforce it). Caps the group
// down to the new minimum + 1 — no refund — rather than requiring the
// owner to manually fix it, and specifically NOT topping the knocked
// property back up, which would undo the card's whole effect.
function rebalanceGroupAfterKnock(owner, color){
  const positions = colorGroupPositions(color);
  const newMin = Math.min(...positions.map(pos => owner.houses[pos] || 0));
  positions.forEach(pos=>{
    if((owner.houses[pos]||0) > newMin + 1){
      owner.houses[pos] = newMin + 1;
    }
  });
}

// Shared full-rent calculation used by both Uno Reverse paths below
// (mirrors payRent/payHalfRent's own rent formula, kept as a separate
// copy rather than refactoring those pre-existing functions).
function calcBaseRent(owner, space){
  let rent;
  if(space.type === 'property'){
    rent = effectivePropertyRent(owner, player_position_of(space), space);
  } else if(space.type === 'railroad'){
    const ownedCount = owner.owned.filter(pos => SPACES[pos].type==='railroad').length;
    rent = RAILROAD_RENT[ownedCount-1];
  } else { // utility
    const ownedCount = owner.owned.filter(pos => SPACES[pos].type==='utility').length;
    const d1 = 1+Math.floor(Math.random()*6);
    const d2 = 1+Math.floor(Math.random()*6);
    const multiplier = ownedCount >= 2 ? 10 : 4;
    rent = (d1+d2) * multiplier;
    log(owner.name+"'s Uno Reverse utility rent roll: "+d1+' + '+d2+'.');
  }
  if(owner.rentMultiplierActive){
    rent *= 2;
    owner.rentMultiplierActive = false;
    log('(Double Toll was active — rent doubled before the Uno Reverse split!)');
  }
  return rent;
}

// Uno Reverse turns rent backward: the OWNER pays the landing player half
// of what full rent would have been. Bypasses skipRentActive/owner-in-jail
// (those exist for the normal payer-pays-owner direction and don't map
// cleanly onto a reversed payment), but still respects a mortgaged
// property (no rent obligation either way).
function payReversedRent(payer, owner, space){
  if(owner.mortgaged[player_position_of(space)]){
    log(space.name+' is mortgaged — no Uno Reverse payout.');
    return;
  }
  const rent = calcBaseRent(owner, space);
  const half = Math.ceil(rent / 2);
  owner.money -= half;
  creditPlayer(payer, half, 'reversed rent');
  log(payer.name+' used Uno Reverse on '+space.name+' — '+owner.name+' paid them $'+half+' instead (half the normal rent).');
  checkBankrupt(owner);
}

// Landing on your own property with Uno Reverse active: pay half the rent
// it would earn out to the other players, split however the player
// chooses (see distributeUnoReverseRent). Pauses the landing — like
// awaiting-buy — until the split is submitted.
function payReversedRentToSelf(player, space){
  if(player.mortgaged[player_position_of(space)]){
    log(space.name+' is mortgaged — Uno Reverse has no effect.');
    return;
  }
  const rent = calcBaseRent(player, space);
  const half = Math.ceil(rent / 2);
  const others = state.players.filter(p=>p.id!==player.id && !p.bankrupt);
  if(others.length === 0 || half <= 0){
    log(player.name+' landed on their own '+space.name+' — Uno Reverse had no effect.');
    return;
  }
  state.pendingUnoReverse = { amount: half };
  state.phase = 'distributing-unoreverse';
  log(player.name+' landed on their own '+space.name+' with Uno Reverse — must pay out $'+half+' to the other players.');
}

function distributeUnoReverseRent(amounts){
  const player = currentPlayer();
  const pending = state.pendingUnoReverse;
  if(!pending || state.phase !== 'distributing-unoreverse') return;
  const others = state.players.filter(p=>p.id!==player.id && !p.bankrupt);
  let total = 0;
  others.forEach(p=>{ total += (amounts[p.id]||0); });
  if(total !== pending.amount){
    log('Distribution must add up to exactly $'+pending.amount+' (currently $'+total+').');
    return;
  }
  player.money -= pending.amount;
  others.forEach(p=>{ creditPlayer(p, amounts[p.id]||0, 'Uno Reverse payout'); });
  log(player.name+' distributed the $'+pending.amount+' Uno Reverse payout: '+others.map(p=>p.name+' $'+(amounts[p.id]||0)).join(', ')+'.');
  state.pendingUnoReverse = null;
  finalizeLandingPhase();
  resumeRevealQueueIfPending();
  checkBankrupt(player);
}

function buyHouse(position){
  const player = currentPlayer();
  if(player.stunnedActive){ log(player.name+" is Stunned and can't build right now."); return; }
  const space = SPACES[position];
  if(!player.owned.includes(position)) return;
  if(space.type !== 'property' && space.type !== 'railroad' && space.type !== 'utility') return;

  const current = player.houses[position] || 0;
  const squatting = hasAbility(player,'vampire');

  if(space.type === 'property'){
    if(ownsFullColorGroup(player, position)){
      if(current > groupMinLevel(player, space.color)){
        log('Build evenly — the rest of the '+space.color+' set needs to catch up first.');
        return;
      }
      // A hotel (or 2 Hotels for Builder) is the ceiling for normal
      // building — only Vampire's steal-and-place mechanic can push a
      // property past that.
      const maxLevel = maxBuildLevelFor(player);
      if(current >= maxLevel){ log(space.name+' already has '+(maxLevel===10?'2 Hotels':'a Hotel')+" — that's the building cap."); return; }
    } else {
      if(!squatting){ log('Need the full color set to build there.'); return; }
      if(current >= 2){ log('Squatting tops out at 2 houses without the full color set.'); return; }
    }
  } else { // railroad/utility
    const builderMonopoly = hasAbility(player,'builder') && ownsAllOfType(player, space.type);
    if(builderMonopoly){
      if(current > groupMinLevelForType(player, space.type)){
        log('Build evenly — the rest of your '+space.type+'s need to catch up first.');
        return;
      }
      const maxLevel = maxBuildLevelFor(player);
      if(current >= maxLevel){ log(space.name+' already has '+(maxLevel===10?'2 Hotels':'a Hotel')+" — that's the building cap."); return; }
    } else if(squatting){
      if(current >= 2){ log('Squatting tops out at 2 houses on '+(space.type==='railroad'?'railroads':'utilities')+'.'); return; }
    } else {
      log('Need an ability that lets you build on '+(space.type==='railroad'?'railroads':'utilities')+'.'); return;
    }
  }

  // Flash Sale: half off, but only as long as the full price still fits
  // within the remaining discount budget — no partial/prorated discount
  // on a house that's bigger than what's left.
  const onSale = (player.flashSaleBudget||0) >= space.houseCost;
  const price = onSale ? Math.ceil(space.houseCost/2) : space.houseCost;
  if(player.money < price) { log('Not enough money to build.'); return; }
  player.money -= price;
  if(onSale) player.flashSaleBudget -= space.houseCost;
  player.houses[position] = current + 1;
  log(player.name+' built '+houseLevelLabel(player.houses[position])+' on '+space.name+(onSale?' for $'+price+' (Flash Sale half off!)':'')+'.');
}

function sellHouse(position){
  const player = currentPlayer();
  if(player.stunnedActive){ log(player.name+" is Stunned and can't sell houses right now."); return; }
  const space = SPACES[position];
  const current = player.houses[position] || 0;
  if(current <= 0) return;
  const refund = Math.floor(space.houseCost/2);
  player.money += refund;
  player.houses[position] = current - 1;
  log(player.name+' sold '+(current===5?'the Hotel':'a house')+' on '+space.name+' for $'+refund+'.');
}

function mortgageProperty(position){
  const player = currentPlayer();
  if(player.stunnedActive){ log(player.name+" is Stunned and can't mortgage right now."); return; }
  const space = SPACES[position];
  if(!player.owned.includes(position)) return;
  if(player.mortgaged[position]) return;
  if(space.type==='property' && (player.houses[position]||0) > 0){
    log('Sell the houses on '+space.name+' before mortgaging it.');
    return;
  }
  const value = Math.floor(space.price/2);
  player.money += value;
  player.mortgaged[position] = true;
  log(player.name+' mortgaged '+space.name+' for $'+value+'.');
}

function unmortgageProperty(position){
  const player = currentPlayer();
  if(player.stunnedActive){ log(player.name+" is Stunned and can't lift mortgages right now."); return; }
  const space = SPACES[position];
  if(!player.mortgaged[position]) return;
  const cost = Math.floor(space.price/2);
  if(player.money < cost){ log('Not enough money to lift the mortgage.'); return; }
  player.money -= cost;
  delete player.mortgaged[position];
  log(player.name+' paid off the mortgage on '+space.name+' for $'+cost+'.');
}

// killer (optional) is whoever the bankrupting payment was made TO — only
// rent payments have one of these. When present: the killer takes the
// bankrupt player's whole hand, and half the price of every house/hotel
// they'd built (same rate as selling to the bank); their properties are
// stripped of houses/mortgages and become "up for grabs" on the board
// rather than transferring to the killer.
function checkBankrupt(player, killer){
  if(player.money < 0 && !player.bankrupt){
    if(hasAbility(player,'luckyduck') && !player.luckyDuckRevived){
      // Whoever bankrupted them only ends up with what the player actually
      // had — claw back the shortfall so the killer isn't paid money that
      // was never really there, then revive with a fresh $500.
      const deficit = -player.money;
      if(killer) killer.money -= deficit;
      player.money = 500;
      player.luckyDuckRevived = true;
      log(player.name+' would have gone bankrupt, but Lucky Duck revives them with $500! (second life used)');
      state.players.forEach(p=>{
        if(p.id !== player.id) notify(p, player.name+' used their Lucky Duck second life to survive bankruptcy!');
      });
      return;
    }
    player.bankrupt = true;
    log(player.name+' has gone bankrupt!');

    // Rent Thief needs 3+ active players — if this bankruptcy drops below
    // that and the card hasn't been drawn yet, it can never come up useful,
    // so pull it straight to the discard pile instead of leaving it live.
    if(state.players.filter(p=>!p.bankrupt).length < 3){
      const idx = state.drawPile.findIndex(c=>c.type==='rentthief');
      if(idx !== -1){
        const [retired] = state.drawPile.splice(idx,1);
        state.discardPile.push(retired);
        log('Rent Thief needs 3+ players — moved from the draw pile to the discard pile.');
      }
    }

    if(killer){
      if(player.hand.length > 0){
        killer.hand.push(...player.hand);
        log(killer.name+" takes "+player.name+"'s remaining "+player.hand.length+' card(s).');
        player.hand = [];
      }
      let houseValue = 0;
      player.owned.forEach(pos=>{
        const level = player.houses[pos] || 0;
        if(level > 0){
          houseValue += Math.floor(SPACES[pos].houseCost/2) * level;
          player.houses[pos] = 0;
        }
      });
      if(houseValue > 0){
        killer.money += houseValue;
        log(killer.name+" collects $"+houseValue+" from "+player.name+"'s houses/hotels, sold back to the bank.");
      }
      player.owned.forEach(pos=>{
        delete player.mortgaged[pos];
        if(!state.upForGrabs.includes(pos)) state.upForGrabs.push(pos);
      });
      if(player.owned.length > 0){
        log(player.name+"'s properties are now up for grabs.");
      }
      player.owned = [];
      if(killer.id === state.current) checkHandTrimming();
    }
  }
}

// Called by server.js once a player has been idle too long (which player,
// and how "too long" is measured, is entirely server.js's concern — this
// only performs the forfeiture itself, on request). Unlike checkBankrupt's
// no-killer path above (which leaves a bankrupt-to-the-bank player's
// properties frozen in place, untouched), an AFK forfeit always frees
// their properties immediately: the owner explicitly asked for "up for
// grabs" on AFK, not frozen, and there's no killer here to hand anything
// to — money, cards, and house/hotel value all just vanish into the bank.
function forfeitPlayer(playerId){
  const player = state.players[playerId];
  if(!player || player.bankrupt) return;
  player.bankrupt = true;
  player.money = 0;
  if(player.hand.length > 0){
    state.discardPile.push(...player.hand);
    player.hand = [];
  }
  player.owned.forEach(pos=>{
    delete player.mortgaged[pos];
    delete player.houses[pos];
    if(!state.upForGrabs.includes(pos)) state.upForGrabs.push(pos);
  });
  player.owned = [];
  log(player.name+' was inactive too long and has forfeited — their money and cards went to the bank, and their properties are up for grabs.');

  if(state.pendingTrade && (state.pendingTrade.fromId === playerId || state.pendingTrade.toId === playerId)){
    log('The pending trade involving '+player.name+' was cancelled.');
    state.pendingTrade = null;
  }

  if(state.players.filter(p=>!p.bankrupt).length < 3){
    const idx = state.drawPile.findIndex(c=>c.type==='rentthief');
    if(idx !== -1){
      const [retired] = state.drawPile.splice(idx,1);
      state.discardPile.push(retired);
      log('Rent Thief needs 3+ players — moved from the draw pile to the discard pile.');
    }
  }

  // Whatever mid-turn decision they were stuck on (a buy prompt, a coin
  // flip, trimming their hand, etc.) is abandoned along with the rest of
  // their turn — endTurn() already knows how to skip a bankrupt player
  // when picking who's next, so this reuses that instead of trying to
  // gracefully unwind every possible phase they could have been idle in.
  if(state.current === playerId){
    endTurn();
  }
}

// Any active player can pause at any time; server.js locks out every
// other action type while paused (see its PAUSE_ACTIONS handling). No
// special-casing for whoever requested it — they vote to unpause like
// anyone else below.
function requestPause(playerId){
  const player = state.players[playerId];
  if(!player || player.bankrupt || state.paused) return;
  state.paused = true;
  state.pausedBy = playerId;
  state.unpauseVotes = [];
  log(player.name+' paused the game.');
}

// Unpausing requires every still-active (non-bankrupt) player to agree —
// deliberately unanimous, not majority or timed, per how this was asked
// for. See CLAUDE_1.md's "Known gaps" note on what happens if a player
// vanishes while paused (unsolved, flagged rather than silently patched).
function voteUnpause(playerId){
  const player = state.players[playerId];
  if(!player || player.bankrupt || !state.paused) return;
  if(!state.unpauseVotes.includes(playerId)) state.unpauseVotes.push(playerId);
  const activeIds = state.players.filter(p=>!p.bankrupt).map(p=>p.id);
  const allAgreed = activeIds.every(id=>state.unpauseVotes.includes(id));
  if(allAgreed){
    state.paused = false;
    state.pausedBy = null;
    state.unpauseVotes = [];
    log('Every player agreed — the game is unpaused.');
  } else {
    log(player.name+' agreed to unpause ('+state.unpauseVotes.length+'/'+activeIds.length+').');
  }
}

// Enforces the 5-card hand cap reactively: pushes the current player into
// a blocking 'trimming-hand' phase if they're over the limit (e.g. from
// receiving a bankrupt player's whole hand), and releases them back to
// whatever they should be doing once they're back to 5 or fewer. Called
// after anything that can change a hand size: endTurn, discardCard,
// acceptTrade, and the bankruptcy transfer above.
function checkHandTrimming(){
  const player = currentPlayer();
  if(player.hand.length > maxHandSize(player)){
    state.phase = 'trimming-hand';
  } else if(state.phase === 'trimming-hand'){
    state.phase = player.inJail ? 'in-jail' : 'pre-roll';
  }
}

// Discarding is always available, on anyone's turn, at that player's own
// discretion — not gated to your own turn like most actions, so it's
// deliberately left out of server.js's TURN_GATED set (the server always
// forces playerId onto it instead, same treatment as the debug actions).
function discardCard(playerId, cardIndex){
  const player = state.players[playerId];
  if(!player) return;
  const card = player.hand[cardIndex];
  if(!card) return;
  player.hand.splice(cardIndex,1);
  state.discardPile.push(card);
  log(player.name+' discarded "'+card.name+'".');
  if(playerId === state.current) checkHandTrimming();
}

function buyProperty(){
  const player = currentPlayer();
  if(player.stunnedActive){ log(player.name+" is Stunned and can't buy the property they landed on."); return; }
  const space = SPACES[state.pendingSpace];
  const price = state.buyDiscount ? Math.ceil(space.price/2) : space.price;
  if(player.money < price) { log('Not enough money to buy.'); return; }
  player.money -= price;
  player.owned.push(state.pendingSpace);
  state.upForGrabs = state.upForGrabs.filter(p=>p!==state.pendingSpace);
  checkBuilderBonus(player);
  log(player.name+' bought '+space.name+' for $'+price+(state.buyDiscount?' (half price!)':'')+'.');
  state.pendingSpace = null;
  state.buyDiscount = false;
  finalizeLandingPhase();
  resumeRevealQueueIfPending();
}

function skipBuy(){
  log(currentPlayer().name+' chose not to buy.');
  state.pendingSpace = null;
  state.buyDiscount = false;
  finalizeLandingPhase();
  resumeRevealQueueIfPending();
}

function stealMortgagedProperty(){
  const player = currentPlayer();
  if(player.stunnedActive){ log(player.name+" is Stunned and can't buy the property they landed on."); return; }
  const pos = state.pendingSpace;
  const space = SPACES[pos];
  const owner = state.players[state.pendingStealFrom];
  const stealPrice = space.price * 2;
  if(player.money < stealPrice){
    log(player.name+" can't afford to steal "+space.name+" (needs $"+stealPrice+").");
  } else {
    player.money -= stealPrice;
    creditPlayer(owner, stealPrice, 'stolen mortgaged property');
    owner.owned = owner.owned.filter(p=>p!==pos);
    delete owner.mortgaged[pos];
    player.owned.push(pos);
    checkBuilderBonus(player);
    log(player.name+' stole mortgaged '+space.name+' from '+owner.name+' for $'+stealPrice+'!');
  }
  state.pendingSpace = null;
  state.pendingStealFrom = null;
  finalizeLandingPhase();
  resumeRevealQueueIfPending();
}

function skipSteal(){
  const space = SPACES[state.pendingSpace];
  log(currentPlayer().name+' chose not to steal '+space.name+'.');
  state.pendingSpace = null;
  state.pendingStealFrom = null;
  finalizeLandingPhase();
  resumeRevealQueueIfPending();
}

function endTurn(){
  const outgoing = state.players[state.current];
  outgoing.smallMoveDir = null; // unused bonus move expires at end of turn
  outgoing.turnsElapsed = (outgoing.turnsElapsed||0) + 1; // their first turn is now behind them — cards unlock from here on
  outgoing.pendingNotifications = []; // they've had their whole turn to see these
  outgoing.flashSaleBudget = 0; // Flash Sale's discount only lasts the turn it was played
  outgoing.stunnedActive = false; // Stunned lasts exactly one full turn

  // Walks state.turnOrder (a fixed, randomized-at-newGame permutation of
  // ids — see newGame) rather than raw id+1, so turn order stays
  // whatever it was randomized to, not just ascending id order.
  let idx = state.turnOrder.indexOf(state.current);
  let next = idx;
  do{
    next = (next+1) % state.turnOrder.length;
  } while(state.players[state.turnOrder[next]].bankrupt && state.turnOrder[next] !== state.current);

  state.current = state.turnOrder[next];
  state.doublesStreak = 0;
  state.doubleBonus = false;
  const player = currentPlayer();
  player.cardsPlayedThisTurn = 0;
  player.upForGrabsBoughtThisTurn = false;

  if(player.hand.length > maxHandSize(player)){
    state.phase = 'trimming-hand';
  } else if(player.inJail){
    state.phase = 'in-jail';
    log(player.name+"'s turn — still in jail ("+player.jailTurns+" turn(s) left).");
    if(player.hand.some(c=>c.type==='jailbreak')){
      notify(player, 'You can play "Jail Break" to break everyone out of Jail (including yourself) — $200 from each other player you free.');
    }
  } else {
    state.phase = 'pre-roll';
  }
}

function serveJailTurn(){
  const player = currentPlayer();
  if(state.phase !== 'in-jail') return;
  player.jailTurns -= 1;
  if(player.jailTurns <= 0){
    player.inJail = false;
    log(player.name+' has served their time and is released from jail!');
    chargeJailExitFeeToOfficer(player);
  } else {
    log(player.name+' spends this turn in jail ('+player.jailTurns+' turn(s) left).');
  }
  endTurn();
}

function rollForJailBreak(){
  const player = currentPlayer();
  if(state.phase !== 'in-jail') return;
  state.rollLandingPos = null; // set below if doubles actually move the player — see the client's animation diff

  const diceCount = player.diceCountOverride || (hasAbility(player,'highroller') ? 3 : 2);
  player.diceCountOverride = null;
  const dice = Array.from({length: diceCount}, () => 1+Math.floor(Math.random()*6));
  const counts = {};
  dice.forEach(d => { counts[d] = (counts[d]||0)+1; });
  const maxSameCount = Math.max(...Object.values(counts));
  const isDouble = maxSameCount >= 2;
  const isTriple = diceCount === 3 && maxSameCount === 3;
  state.lastDice = dice;
  log(player.name+' rolled '+dice.join(' + ')+' to try to break out of jail.'+(isDouble?' Doubles!':''));

  if(isTriple){
    player.money += 500;
    log(player.name+' rolled triples! Bonus $500.');
  }

  if(isDouble){
    const total = dice.reduce((a,b)=>a+b,0);
    player.inJail = false;
    player.jailTurns = 0;
    log(player.name+' broke out of jail!');
    chargeJailExitFeeToOfficer(player);

    const fromPos = player.position;
    const passedGo = (fromPos + total) >= 40;
    player.position = (fromPos + total) % 40;
    state.rollLandingPos = player.position; // see the matching note in rollDice()
    markFreeParkingProgress(player, fromPos, player.position, total);
    if(passedGo){
      awardPassingGoWithCard(player);
    }
    resolvePassByTraps(player, fromPos, total, 1);
    if(player.pickupActive){
      const passedCount = countChanceChestPassed(fromPos, total);
      if(passedCount > 0){
        for(let i=0;i<passedCount;i++) drawCardIfRoom(player);
        log(player.name+' picked up '+passedCount+' card(s) from Pickup while passing Chance/Community Chest.');
      }
      player.pickupActive = false;
    }
    const grabbable = upForGrabsPassed(fromPos, total, 1);
    if(offerUpForGrabsIfAny(player, grabbable, {jailBreak:true})) return;
    resolveLanding(player);
  } else {
    player.jailTurns -= 1;
    if(player.jailTurns <= 0){
      player.inJail = false;
      log(player.name+' has served their time and is released from jail!');
      chargeJailExitFeeToOfficer(player);
    } else {
      log(player.name+' stays in jail ('+player.jailTurns+' turn(s) left).');
    }
    endTurn();
  }
}

function useGetOutOfJailFree(){
  const player = currentPlayer();
  if(state.phase !== 'in-jail') return;
  if(player.getOutOfJailFree <= 0) return;
  player.getOutOfJailFree -= 1;
  player.inJail = false;
  player.jailTurns = 0;
  log(player.name+' used a Get Out of Jail Free card and can play normally this turn!');
  state.phase = 'pre-roll';
}

function debugAddMoney(playerId){
  const player = state.players[playerId];
  if(!player) return;
  player.money += 500;
  log('[DEBUG] '+player.name+' received $500 for testing.');
}

function debugGiveProperty(playerId, pos){
  const player = state.players[playerId];
  if(!player) return;
  state.players.forEach(p=>{
    if(p.owned.includes(pos)){
      p.owned = p.owned.filter(x=>x!==pos);
      delete p.mortgaged[pos];
      delete p.houses[pos];
    }
  });
  player.owned.push(pos);
  checkBuilderBonus(player);
  log('[DEBUG] '+player.name+' was given '+SPACES[pos].name+'.');
}

function debugGiveCard(playerId, idx){
  const player = state.players[playerId];
  if(!player) return;
  const card = CARD_DEFS[idx];
  if(!card) return;
  player.hand.push(card);
  log('[DEBUG] '+player.name+' was given card "'+card.name+'".');
}

// Debug-only: bypasses the normal no-duplicates pool AND the ruleset's
// maxAbilitiesPerPlayer/disabledAbilityIds, since this is purely for
// testing a specific ability on demand. Still won't stack the exact same
// ability twice on one player (pointless — nothing reads a count).
function debugGiveAbility(playerId, abilityId){
  const player = state.players[playerId];
  if(!player) return;
  const ability = ABILITY_DEFS.find(a=>a.id===abilityId);
  if(!ability) return;
  if(player.abilities.includes(ability.id)) return;
  player.abilities.push(ability.id);
  if(ability.id === 'officer'){
    [4, 38].forEach(pos=>{
      const prevOwner = findOwner(pos);
      if(prevOwner) prevOwner.owned = prevOwner.owned.filter(p=>p!==pos);
      if(!player.owned.includes(pos)) player.owned.push(pos);
    });
  }
  log('[DEBUG] '+player.name+' was given the ability "'+ability.name+'".');
}

// Rent Thief-only: lets a player swap it out for a fresh card once it's
// stuck unusable (fewer than 3 active players left). Only works while
// that's actually true, so it can't be used as a free extra draw.
function redrawRentThiefCard(playerId, cardIndex){
  const player = state.players[playerId];
  if(!player) return;
  const card = player.hand[cardIndex];
  if(!card || card.type !== 'rentthief') return;
  if(state.players.filter(p=>!p.bankrupt).length >= 3) return;
  player.hand.splice(cardIndex,1);
  state.discardPile.push(card);
  const newCard = drawFromPile();
  if(newCard) player.hand.push(newCard);
  log(player.name+' swapped out "'+card.name+'" for a new card (not enough players left to use it).');
}

function proposeTrade(targetId, giveProps, receiveProps, giveMoney, receiveMoney, giveCardIdx, receiveCardIdx){
  const me = currentPlayer();
  if(me.stunnedActive){ log(me.name+" is Stunned and can't trade right now."); return; }
  const target = state.players[targetId];
  if(!target) return;

  giveProps = giveProps.filter(pos => me.owned.includes(pos));
  receiveProps = receiveProps.filter(pos => target.owned.includes(pos));
  giveMoney = parseInt(giveMoney) || 0;
  receiveMoney = parseInt(receiveMoney) || 0;
  // Card offers are captured as hand indices at propose time — see the
  // "known limitation" note in CLAUDE_1.md about indices shifting if a
  // hand changes between propose and accept.
  giveCardIdx = (giveCardIdx||[]).filter(i => Number.isInteger(i) && i>=0 && i<me.hand.length);
  // Hands are hidden — you can offer a card of your own, but you can never
  // request a specific card from someone else's (unseen) hand.
  receiveCardIdx = [];

  if(giveProps.length===0 && receiveProps.length===0 && giveMoney===0 && receiveMoney===0 && giveCardIdx.length===0 && receiveCardIdx.length===0){
    log('Select at least one property, card, or amount to propose a trade.');
    return;
  }
  if(giveMoney > me.money){ log(me.name+" doesn't have enough cash for that offer."); return; }
  if(receiveMoney > target.money){ log(target.name+" doesn't have enough cash for that offer."); return; }

  state.pendingTrade = { fromId: me.id, toId: target.id, giveProps, receiveProps, giveMoney, receiveMoney, giveCardIdx, receiveCardIdx };
  log(me.name+' proposed a trade to '+target.name+'.');
}

function acceptTrade(){
  const t = state.pendingTrade;
  if(!t) return;
  const from = state.players[t.fromId];
  const to = state.players[t.toId];
  if(to.stunnedActive){ log(to.name+" is Stunned and can't accept trades right now."); return; }

  // Pull the actual card objects out before splicing (descending index
  // order so earlier splices don't shift indices still to be removed).
  const giveCardIdx = (t.giveCardIdx||[]).slice().sort((a,b)=>b-a);
  const giveCards = giveCardIdx.map(i => from.hand[i]).filter(Boolean);
  giveCardIdx.forEach(i => { if(from.hand[i]) from.hand.splice(i,1); });

  const receiveCardIdx = (t.receiveCardIdx||[]).slice().sort((a,b)=>b-a);
  const receiveCards = receiveCardIdx.map(i => to.hand[i]).filter(Boolean);
  receiveCardIdx.forEach(i => { if(to.hand[i]) to.hand.splice(i,1); });

  giveCards.forEach(c => to.hand.push(c));
  receiveCards.forEach(c => from.hand.push(c));

  t.giveProps.forEach(pos=>{
    from.owned = from.owned.filter(p=>p!==pos);
    to.owned.push(pos);
    if(from.mortgaged[pos]){ delete from.mortgaged[pos]; to.mortgaged[pos] = true; }
  });
  t.receiveProps.forEach(pos=>{
    to.owned = to.owned.filter(p=>p!==pos);
    from.owned.push(pos);
    if(to.mortgaged[pos]){ delete to.mortgaged[pos]; from.mortgaged[pos] = true; }
  });
  from.money -= t.giveMoney;
  from.money += t.receiveMoney;
  to.money += t.giveMoney;
  to.money -= t.receiveMoney;

  log(from.name+' and '+to.name+' completed the trade.');
  checkBuilderBonus(from);
  checkBuilderBonus(to);
  state.pendingTrade = null;
  checkBankrupt(from);
  checkBankrupt(to);
  checkHandTrimming();
}

function declineTrade(){
  const t = state.pendingTrade;
  if(t){
    const from = state.players[t.fromId];
    const to = state.players[t.toId];
    log(to.name+' declined the trade from '+from.name+'.');
  }
  state.pendingTrade = null;
}
module.exports = {
  // data (read by server.js for room setup / validation)
  SPACES, CARD_DEFS, ABILITY_DEFS, COLORS, RAILROAD_RENT, DEFAULT_RULESET, normalizeRuleset,
  // state access — server.js swaps this before/after every action
  getState: () => state,
  setState: (s) => { state = s; },
  // room lifecycle
  newGame, addPlayer,
  // core actions (all operate on whatever state is currently loaded)
  rollDice, rollAgain, confirmSmallMove, skipRoll,
  playCard, chooseTeleportDestination, chooseCardTarget, chooseTaxationDestination,
  chooseSwitchAnyFirst, chooseSwitchAnySecond,
  flipCoinsForSteal, resolveCoinStealOutcome,
  takeGoBonusMoney, chooseGoTeleportOption, chooseGoTeleportDestination,
  chooseTheftTarget, chooseTheftGiveback, flipCoinsForCustom, chooseCustomDiceValues, resolveCustomNoEffect,
  flipCoinsForSlow, resolveSlowFlipsOutcome,
  flipCoinsForBonus, chooseSpeedFlipBonus, flipCoinsForCurse, resolveCurseOutcome, distributeCurseLoss,
  acknowledgeRevealCard,
  flipCoinsForFlipDraw, resolveFlipDrawOutcome,
  flipCoinsForDemolisher, demolishHouse, skipDemolisherDestroy,
  flipCoinsForLottery, resolveLotteryOutcome, chooseLotteryDestination,
  chooseUpForGrabsProperty, skipUpForGrabs,
  flipCoinsForBuilder, buildHouseFromBuilder, skipBuilderBuild,
  chooseDiceCount, chooseGoAnywhereDestination,
  choosePassByProperty, chooseCardSwitchTheirs, chooseCardSwitchMine,
  distributeUnoReverseRent, flipCoinsForDriveByCoin, resolveDriveByCoinOutcome,
  chooseTeleportOtherDestination, assignGiveawayCard,
  chooseHalfChoosingValue, flipCoinsForGamblingNight, resolveGamblingNightOutcome,
  chooseGoAbility,
  performReroll,
  acknowledgeFreeloProperty, discardCard, redrawRentThiefCard, forfeitPlayer,
  requestPause, voteUnpause,
  buyProperty, skipBuy, stealMortgagedProperty, skipSteal,
  buyHouse, sellHouse, placeVampireHouse, mortgageProperty, unmortgageProperty,
  endTurn, serveJailTurn, rollForJailBreak, useGetOutOfJailFree,
  proposeTrade, acceptTrade, declineTrade,
  debugAddMoney, debugGiveProperty, debugGiveCard, debugGiveAbility,
  // helpers occasionally useful to server.js directly
  currentPlayer, findOwner,
};
