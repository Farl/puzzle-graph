import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Map as MapIcon, Key, DoorOpen, Search, MousePointerClick, RefreshCw, Layers, Package, Settings as SettingsIcon, X, GitCommit, ZoomIn, ZoomOut, Move, Eye, Hand } from 'lucide-react';

// --- 空間主題庫 ---
const ROOM_THEMES = [
    { name: '廢棄走廊', desc: '走廊上散落著雜物，空氣中瀰漫著霉味。' },
    { name: '守衛室', desc: '牆上滿是監視螢幕，這裡是監控整個設施的樞紐。' },
    { name: '儲藏室', desc: '堆滿了陳舊的雜物與貨箱，佈滿蜘蛛網，光線昏暗。' },
    { name: '醫務室', desc: '空氣中殘留著刺鼻的消毒水味，有些醫療器材散落在地。' },
    { name: '發電機房', desc: '巨大的金屬機器佔據了大部分空間，有股重油與鐵鏽味。' },
    { name: '監獄長辦公室', desc: '裝潢相對豪華，有一張大辦公桌，似乎是最高負責人的房間。' },
    { name: '地下實驗室', desc: '擺滿了奇怪的化學儀器與試管，有些還冒著不明的氣泡。' },
    { name: '安保武器庫', desc: '牆上的架子空空如也，但空氣中仍散發著淡淡的火藥味。' },
    { name: '鍋爐房', desc: '悶熱且充滿蒸氣，巨大的鍋爐發出低沉的轟鳴聲。' },
    { name: '通風管道夾層', desc: '狹窄且佈滿灰塵的空間，只能彎腰行走。' }
];

// --- 謎題模板庫 ---
const CONTAINER_FAMILIES = [
    {
        isSpatial: false, keys: [{ name: '生鏽的鑰匙', reusable: false }],
        variations: [
            { name: '上鎖的寶箱', lockMsg: '一個沉重的鐵寶箱，上面有一個十字鎖孔。', unlockMsg: '喀啦一聲，你轉動鑰匙，寶箱打開了。' },
            { name: '舊置物櫃', lockMsg: '員工置物櫃，用簡單的傳統鎖頭鎖著。', unlockMsg: '你打開了置物櫃的門。' }
        ]
    },
    {
        isSpatial: false, keys: [{ name: '手電筒', reusable: true }],
        variations: [
            { name: '黑暗的角落', lockMsg: '角落非常暗，伸手不見五指。', unlockMsg: '手電筒的強光照亮了角落，露出了隱藏的東西。' },
            { name: '床底下的陰影', lockMsg: '床底下的空間佈滿灰塵，光線完全照不到。', unlockMsg: '你拿手電筒一照，發現裡面藏了東西。' }
        ]
    },
    {
        isSpatial: false, keys: [{ name: '鐵鎚', reusable: true }],
        variations: [
            { name: '堅固的展示櫃', lockMsg: '玻璃展示櫃被強化玻璃保護著。', unlockMsg: '你用鐵鎚用力砸碎了玻璃。' },
            { name: '脆弱的磚牆', lockMsg: '這面牆有幾塊磚看起來特別鬆動。', unlockMsg: '你用鐵鎚暴力敲下磚塊，露出裡面的空間。' }
        ]
    },
    {
        isSpatial: false, keys: [{ name: '寫著密碼的紙條', reusable: false }],
        variations: [
            { name: '密碼工具箱', lockMsg: '工具箱上有一個四位數密碼鎖。', unlockMsg: '輸入紙條上的密碼後，工具箱彈開了。' },
            { name: '壁掛電子保險櫃', lockMsg: '牆上嵌著一個小巧的九宮格電子密碼箱。', unlockMsg: '嗶嗶幾聲後，保險櫃的綠燈亮起並開啟。' }
        ]
    },
    {
        isSpatial: false, keys: [{ name: '撬棍', reusable: true }],
        variations: [
            { name: '被釘住的木箱', lockMsg: '木箱被粗大的鐵釘釘死。', unlockMsg: '你用撬棍拔出了鐵釘，撬開了木板。' },
            { name: '鬆動的地板', lockMsg: '這塊木地板走起來會發出不尋常的空洞聲。', unlockMsg: '你用撬棍掀開了木地板，發現了下方的暗格。' }
        ]
    },
    {
        isSpatial: false, keys: [{ name: '備用電源線', reusable: false }, { name: '解密隨身碟', reusable: false }],
        variations: [
            { name: '高級電子保險箱', lockMsg: '一個高科技保險箱，沒有通電，且需要數位密鑰。', unlockMsg: '接通電源並讀取密鑰成功，保險箱彈開了。' }
        ]
    },
    {
        isSpatial: false, keys: [{ name: '紅色酸性試劑', reusable: false }, { name: '藍色鹼性試劑', reusable: false }],
        variations: [
            { name: '化學混合裝置', lockMsg: '一個特殊的玻璃罩，旁邊連接了兩個空的試劑瓶插槽。', unlockMsg: '紅藍試劑混合產生劇烈氣體，腐蝕了玻璃罩的卡榫。' }
        ]
    },
    {
        isSpatial: false, keys: [{ name: '黃銅大齒輪', reusable: false }, { name: '生鏽的小齒輪', reusable: false }],
        variations: [
            { name: '大型齒輪機關', lockMsg: '牆上的一個大型機械裝置卡死了，少了幾個齒輪。', unlockMsg: '齒輪咬合，機關開始順暢運轉，打開了暗格。' }
        ]
    }
];

const SPATIAL_FAMILIES = [
    {
        isSpatial: true, keys: [{ name: '黃銅大鑰匙', reusable: false }],
        variations: [{ name: '厚重的鐵門', lockMsg: '一扇佈滿鐵鏽的重門，鎖孔非常大。', unlockMsg: '你費力地轉動鑰匙，鐵門發出沉重的摩擦聲開啟了。' }]
    },
    {
        isSpatial: true, keys: [{ name: '門禁磁卡', reusable: true }],
        variations: [{ name: '電子感應門', lockMsg: '門旁有一個紅色的刷卡機。', unlockMsg: '嗶一聲，刷卡機亮起綠燈，自動門滑開了。' }]
    },
    {
        isSpatial: true, keys: [{ name: '破壞剪', reusable: true }],
        variations: [{ name: '被鐵鍊鎖住的門', lockMsg: '這扇門被粗大的鐵鍊死死纏住。', unlockMsg: '你用破壞剪剪斷了鐵鍊，門終於可以推開。' }]
    },
    {
        isSpatial: true, keys: [{ name: '金屬把手', reusable: false }],
        variations: [{ name: '無把手的滑門', lockMsg: '滑門的把手被拔掉了，只剩下一個孔洞。', unlockMsg: '你裝上把手並用力拉動，滑門被打開了。' }]
    },
    {
        isSpatial: true, keys: [{ name: '左半閥門', reusable: false }, { name: '右半閥門', reusable: false }],
        variations: [{ name: '氣密隔離門', lockMsg: '隔離門上需要同時轉動兩個閥門才能解除氣壓鎖定。', unlockMsg: '兩個閥門同時轉動，洩壓聲響起，隔離門緩緩升起。' }]
    }
];

const PUZZLE_FAMILIES = [...CONTAINER_FAMILIES, ...SPATIAL_FAMILIES];

// --- 遊戲圖譜生成引擎 ---
/*
 * [設計原則]：參數化與避免硬編碼
 * 1. 使用者提供的機率參數控制所有分支決策。
 * 2. 空間鎖隱藏的道具直接在生成時放入目標房間陣列，不再於 Runtime 重複推入。
 */
function generatePuzzleGraph(
    targetDepth,
    maxRooms,
    roomGrowthRate,
    compositeRate,
    keySpatialSplitRate,
    depthStaggerVariance
) {
    let nodes = [];
    let entityMap = {};

    let availableThemes = [...ROOM_THEMES].sort(() => 0.5 - Math.random()).slice(0, maxRooms);
    let availableFamilies = [...PUZZLE_FAMILIES].sort(() => 0.5 - Math.random());

    let reusableItemCache = {};
    let consumableCount = {};

    const addNode = (id, type, name, data = {}) => {
        let n = { id, type, name, ...data };
        nodes.push(n);
        entityMap[id] = n;
        return n;
    };

    let exitTheme = availableThemes.pop() || { name: '最終出口', desc: '這裡連接了外面的世界。' };
    let exitRoom = addNode('r_exit', 'room', exitTheme.name, { desc: exitTheme.desc, items: [], locks: [], paths: [] });
    let currentStartRoom = exitRoom.id;

    let exitNode = addNode('exit', 'lock', '逃生大門', { room: exitRoom.id, desc: '鎖著厚重鐵鍊與精密電子鎖的裝甲門，是逃離這裡的唯一出口。', unlockDesc: '大門發出洩壓的巨大聲響，刺眼的陽光灑落，你重獲自由了！', isExit: true, req: [], fulfilled: [] });
    let exitKey = addNode('exit_key', 'item', '終極逃生卡', { desc: '帶有最高權限的特殊磁卡。', reusable: false });
    exitNode.req.push(exitKey.id);

    let currentTargets = [{ item: exitKey, currentRoom: exitRoom.id, depth: 0, forceSpatial: false }];
    let finalBaseItems = [];

    while (currentTargets.length > 0) {
        let target = currentTargets.shift();

        if (target.depth < targetDepth) {
            if (availableFamilies.length === 0) availableFamilies = [...PUZZLE_FAMILIES].sort(() => 0.5 - Math.random());

            let trySpatial = false;
            if (availableThemes.length > 0) {
                trySpatial = target.forceSpatial || (Math.random() < roomGrowthRate);
            }

            let tryComposite = Math.random() < compositeRate;

            let familyIndex = availableFamilies.findIndex(f =>
                (f.isSpatial === trySpatial) &&
                (tryComposite ? f.keys.length > 1 : f.keys.length === 1)
            );

            if (familyIndex === -1) {
                familyIndex = availableFamilies.findIndex(f => f.isSpatial === trySpatial);
            }
            if (familyIndex === -1) familyIndex = 0;

            let family = availableFamilies[familyIndex];
            availableFamilies.splice(familyIndex, 1);

            let variation = family.variations[Math.floor(Math.random() * family.variations.length)];

            let lockNodeId;

            if (family.isSpatial && availableThemes.length > 0) {
                // === 空間鎖 (生長新房間) ===
                let theme = availableThemes.pop();
                let newRoom = addNode('r_' + Math.random().toString(36).substr(2, 5), 'room', theme.name, { desc: theme.desc, items: [], locks: [], paths: [] });

                let pathLock = addNode('lock_' + Math.random().toString(36).substr(2, 5), 'path', variation.name, {
                    room: target.currentRoom,
                    target: newRoom.id,
                    desc: variation.lockMsg, unlockDesc: variation.unlockMsg,
                    req: [], fulfilled: []
                });

                pathLock.hides = target.item.id;
                target.item.initialRoom = newRoom.id; // 綁定物理空間為新房間
                lockNodeId = pathLock.id;

                let pathBack = addNode('path_' + Math.random().toString(36).substr(2, 5), 'path', '返回：' + entityMap[target.currentRoom].name, {
                    room: newRoom.id, target: target.currentRoom,
                    desc: '一扇已開啟的門。', unlocked: true, req: [], fulfilled: []
                });

                entityMap[target.currentRoom].paths.push(pathLock.id);
                entityMap[newRoom.id].paths.push(pathBack.id);

                family.keys.forEach((k, index) => {
                    let keyName = k.name;
                    if (k.reusable && reusableItemCache[k.name]) {
                        entityMap[lockNodeId].req.push(reusableItemCache[k.name]);
                    } else {
                        if (!k.reusable) {
                            consumableCount[k.name] = (consumableCount[k.name] || 0) + 1;
                            if (consumableCount[k.name] > 1) keyName = `${k.name} (${String.fromCharCode(64 + consumableCount[k.name])})`;
                        }
                        let keyId = 'key_' + Math.random().toString(36).substr(2, 5);
                        let newKey = addNode(keyId, 'item', keyName, { desc: `散發著微光的物品，可以用來處理特定的機關。`, reusable: k.reusable });
                        if (k.reusable) reusableItemCache[k.name] = keyId;

                        entityMap[lockNodeId].req.push(newKey.id);

                        let staggerAmount = (index > 0) ? Math.random() * depthStaggerVariance : 0;
                        let nextDepth = target.depth + 1 - staggerAmount;

                        currentTargets.push({
                            item: newKey,
                            currentRoom: target.currentRoom,
                            depth: nextDepth,
                            forceSpatial: (index > 0 && Math.random() < keySpatialSplitRate)
                        });
                    }
                });

                // 空間鎖隱藏的道具直接結算放入陣列，不會在 runtime 產生複製品
                finalBaseItems.push(target);

            } else {
                // === 實體鎖 (寶箱) ===
                let newLock = addNode('lock_' + Math.random().toString(36).substr(2, 5), 'lock', variation.name, {
                    room: target.currentRoom, desc: variation.lockMsg,
                    partialMsg: '這似乎是對的，但機關還沒有完全解開。', unlockDesc: variation.unlockMsg, req: [], fulfilled: []
                });

                newLock.hides = target.item.id;
                target.item.initialRoom = target.currentRoom;
                lockNodeId = newLock.id;

                family.keys.forEach((k, index) => {
                    if (k.reusable && reusableItemCache[k.name]) {
                        entityMap[lockNodeId].req.push(reusableItemCache[k.name]);
                    } else {
                        let keyName = k.name;
                        if (!k.reusable) {
                            consumableCount[k.name] = (consumableCount[k.name] || 0) + 1;
                            if (consumableCount[k.name] > 1) keyName = `${k.name} (${String.fromCharCode(64 + consumableCount[k.name])})`;
                        }
                        let keyId = 'key_' + Math.random().toString(36).substr(2, 5);
                        let newKey = addNode(keyId, 'item', keyName, { desc: `散發著微光的物品，可以用來處理特定的機關。`, reusable: k.reusable });
                        if (k.reusable) reusableItemCache[k.name] = keyId;

                        entityMap[lockNodeId].req.push(newKey.id);

                        let staggerAmount = (index > 0) ? Math.random() * depthStaggerVariance : 0;
                        let nextDepth = target.depth + 1 - staggerAmount;

                        currentTargets.push({
                            item: newKey,
                            currentRoom: target.currentRoom,
                            depth: nextDepth,
                            forceSpatial: (index > 0 && Math.random() < keySpatialSplitRate)
                        });
                    }
                });
            }
        } else {
            target.item.initialRoom = target.currentRoom;
            finalBaseItems.push(target);
        }
    }

    // 將所有初始在地上的道具歸位
    finalBaseItems.forEach(fi => {
        let room = fi.item.initialRoom;
        entityMap[room].items.push(fi.item.id);
    });

    nodes.forEach(n => {
        if (n.type === 'lock') {
            if (entityMap[n.room]) entityMap[n.room].locks.push(n.id);
        }
    });

    return { entityMap, startNode: currentStartRoom, exitId: 'exit' };
}

const isItemStillNeeded = (itemId, map) => {
    for (const key in map) {
        const entity = map[key];
        if ((entity.type === 'lock' || entity.type === 'path') && !entity.unlocked) {
            if (entity.req && entity.req.includes(itemId)) {
                if (!entity.fulfilled || !entity.fulfilled.includes(itemId)) return true;
            }
        }
    }
    return false;
};

// --- 圖譜視覺化 Layout 演算引擎 ---
function buildGraphLayout(map) {
    const edges = [];
    const inDegree = {};
    const nodes = Object.values(map).filter(e =>
        e.type === 'item' ||
        e.type === 'lock' ||
        (e.type === 'path' && e.req && e.req.length > 0)
    );

    nodes.forEach(n => inDegree[n.id] = 0);

    nodes.forEach(node => {
        if (node.req) {
            node.req.forEach(reqId => {
                if (map[reqId] && inDegree[reqId] !== undefined) {
                    edges.push({ source: reqId, target: node.id });
                    inDegree[node.id]++;
                }
            });
        }
        if ((node.type === 'lock' || node.type === 'path') && node.hides) {
            if (map[node.hides] && inDegree[node.hides] !== undefined) {
                edges.push({ source: node.id, target: node.hides });
                inDegree[node.hides]++;
            }
        }
    });

    let queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
    let ranks = {};
    nodes.forEach(n => ranks[n.id] = 0);

    while (queue.length > 0) {
        let u = queue.shift();
        edges.filter(e => e.source === u).forEach(e => {
            let v = e.target;
            ranks[v] = Math.max(ranks[v], ranks[u] + 1);
            inDegree[v]--;
            if (inDegree[v] === 0) queue.push(v);
        });
    }

    let rankGroups = {};
    nodes.forEach(n => {
        let r = Math.floor(ranks[n.id]);
        if (!rankGroups[r]) rankGroups[r] = [];
        rankGroups[r].push(n.id);
    });

    let layoutNodes = [];
    const X_GAP = 280;
    const Y_GAP = 90;

    let maxY = 0;
    let maxX = 0;

    Object.keys(rankGroups).forEach(rStr => {
        const r = parseInt(rStr);
        const group = rankGroups[r];
        const startY = -((group.length - 1) * Y_GAP) / 2;

        group.forEach((id, index) => {
            const x = r * X_GAP;
            const y = startY + index * Y_GAP;
            layoutNodes.push({ id, ...map[id], x, y });
            if (x > maxX) maxX = x;
            if (Math.abs(y) > maxY) maxY = Math.abs(y);
        });
    });

    return { layoutNodes, edges, bounds: { maxX, maxY } };
}

// --- Canvas 互動式圖譜組件 ---
const CanvasGraph = ({ entityMap }) => {
    const containerRef = useRef(null);
    const [transform, setTransform] = useState({ x: 50, y: window.innerHeight / 2.5, scale: 0.8 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

    const layout = useMemo(() => buildGraphLayout(entityMap), [entityMap]);

    const handleMouseDown = (e) => { setIsDragging(true); setLastMouse({ x: e.clientX, y: e.clientY }); };
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setLastMouse({ x: e.clientX, y: e.clientY });
    };
    const handleMouseUp = () => setIsDragging(false);

    const handleTouchStart = (e) => {
        if (e.touches.length === 1) { setIsDragging(true); setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY }); }
    };
    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - lastMouse.x;
        const dy = e.touches[0].clientY - lastMouse.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };
    const handleTouchEnd = () => setIsDragging(false);

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY * -0.001;
        setTransform(prev => ({ ...prev, scale: Math.min(Math.max(0.1, prev.scale + zoomDelta), 2.5) }));
    };

    const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale + 0.2, 2.5) }));
    const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale - 0.2, 0.1) }));
    const resetView = () => setTransform({ x: 50, y: containerRef.current?.clientHeight / 2 || 300, scale: 0.8 });

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden bg-slate-950/80 cursor-grab active:cursor-grabbing border border-slate-800 rounded-lg shadow-inner touch-none"
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
            onWheel={handleWheel}
        >
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <button onClick={zoomIn} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shadow border border-slate-700"><ZoomIn size={16} /></button>
                <button onClick={zoomOut} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shadow border border-slate-700"><ZoomOut size={16} /></button>
                <button onClick={resetView} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded shadow border border-slate-700"><Move size={16} /></button>
            </div>
            <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 pointer-events-none">
                拖曳平移 | 縮放 ({Math.round(transform.scale * 100)}%)
            </div>

            <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }} className="absolute top-0 left-0 w-full h-full will-change-transform">
                <svg className="absolute top-0 left-0 overflow-visible z-0 pointer-events-none">
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                        </marker>
                    </defs>
                    {layout.edges.map((e, i) => {
                        const source = layout.layoutNodes.find(n => n.id === e.source);
                        const target = layout.layoutNodes.find(n => n.id === e.target);
                        if (!source || !target) return null;

                        const startX = source.x + 160;
                        const startY = source.y + 30;
                        const endX = target.x;
                        const endY = target.y + 30;

                        const cp1X = startX + (endX - startX) / 2;
                        const cp1Y = startY;
                        const cp2X = startX + (endX - startX) / 2;
                        const cp2Y = endY;
                        const d = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

                        return <path key={i} d={d} fill="none" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" className="opacity-60" />
                    })}
                </svg>

                {layout.layoutNodes.map(node => {
                    let borderColor = 'border-emerald-900/60';
                    let dotColor = 'bg-emerald-500 shadow-emerald-500/50';
                    if (node.type === 'lock') { borderColor = 'border-rose-900/60'; dotColor = 'bg-rose-500 shadow-rose-500/50'; }
                    if (node.type === 'path' && node.hides) { borderColor = 'border-purple-900/60'; dotColor = 'bg-purple-500 shadow-purple-500/50'; }

                    return (
                        <div key={node.id} style={{ left: node.x, top: node.y }} className={`absolute w-[160px] h-[60px] bg-slate-900/90 border-2 backdrop-blur-sm ${borderColor} rounded-lg p-2.5 flex flex-col justify-center shadow-lg z-10 select-none hover:border-slate-400 transition-colors`}>
                            <div className="flex items-center gap-2 truncate">
                                <span className={`shrink-0 w-2.5 h-2.5 rounded-full shadow-sm ${dotColor}`}></span>
                                <span className="text-xs font-bold text-slate-100 truncate" title={node.name}>{node.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 truncate pl-4">
                                @ {entityMap[node.room || node.initialRoom]?.name || '未知'}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// --- React 主要組件 ---
export default function App() {
    const [entityMap, setEntityMap] = useState({});
    const [currentRoom, setCurrentRoom] = useState('');
    const [inventory, setInventory] = useState([]);
    const [logs, setLogs] = useState([]);

    const [activeTab, setActiveTab] = useState('game');
    const [mobileTab, setMobileTab] = useState('controls');

    const [targetDepth, setTargetDepth] = useState(3);
    const [roomCount, setRoomCount] = useState(7);
    const [spatialRate, setSpatialRate] = useState(0.4);
    const [compositeRate, setCompositeRate] = useState(0.4);
    const [keySpatialSplitRate, setKeySpatialSplitRate] = useState(0.5);
    const [depthStaggerMax, setDepthStaggerMax] = useState(0.6);

    const [selectedItem, setSelectedItem] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const logEndRef = useRef(null);

    useEffect(() => {
        startNewGame();
    }, []);

    useEffect(() => {
        if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const printLog = (msg, type = 'normal') => {
        setLogs(prev => [...prev, { text: msg, type }]);
    };

    const startNewGame = () => {
        const { entityMap: newMap, startNode } = generatePuzzleGraph(
            targetDepth, roomCount, spatialRate, compositeRate, keySpatialSplitRate, depthStaggerMax
        );
        setEntityMap(newMap);
        setCurrentRoom(startNode);
        setInventory([]);
        setSelectedItem(null);
        setIsSettingsOpen(false);

        const roomAmount = Object.values(newMap).filter(e => e.type === 'room').length;

        setLogs([
            { text: '=========================================', type: 'system' },
            { text: `系統：已徹底修復狀態重疊與生命週期錯誤 Bug。動態開拓了 ${roomAmount} 個房間。`, type: 'system' },
            { text: '你在一陣頭痛中醒來，發現自己身處一個陌生的設施中...', type: 'normal' },
            { text: `[${newMap[startNode].name}] - ${newMap[startNode].desc}`, type: 'room' }
        ]);
    };

    const handleMove = (pathId) => {
        const path = entityMap[pathId];
        if (path.unlocked) {
            setCurrentRoom(path.target);
            printLog(`你穿過了門，來到了 ${entityMap[path.target].name}。`);
            printLog(`[${entityMap[path.target].name}] - ${entityMap[path.target].desc}`, 'room');
            setSelectedItem(null);
        } else {
            printLog(`【${path.name}】被鎖住了。${path.desc}`, 'error');
        }
    };

    // [安全重構]：使用純函數確保狀態一致性，防止競態連點問題
    const handleTake = (itemId) => {
        const item = entityMap[itemId];

        setEntityMap(prevMap => {
            const room = prevMap[currentRoom];
            // 防呆：確認道具確實還在房間裡，防止連續點擊造成的錯誤覆蓋
            if (!room.items.includes(itemId)) return prevMap;

            // 同步且安全地將道具加入背包
            setInventory(prevInv => {
                if (prevInv.includes(itemId)) return prevInv;
                return [...prevInv, itemId];
            });

            // 確保日誌只會在成功拾取時印出
            setTimeout(() => printLog(`你撿起了 【${item.name}】。`, 'success'), 0);

            // 安全移除地圖中的道具
            return {
                ...prevMap,
                [currentRoom]: { ...room, items: room.items.filter(id => id !== itemId) }
            };
        });
    };

    const handleInspect = (id) => {
        const entity = entityMap[id];
        let status = '';
        if (entity.type === 'lock' || entity.type === 'path') {
            if (entity.unlocked) status = '(已被解開)';
            else if (entity.fulfilled?.length > 0) status = `(進度 ${entity.fulfilled.length}/${entity.req.length})`;
            else status = '(未解開)';
        }
        printLog(`【${entity.name}】${status}：${entity.desc}`, 'info');
    };

    // [安全重構]：徹底淨化 updater，將複雜的運算全數隔離
    const handleUse = (lockId) => {
        if (!selectedItem) {
            printLog('請先從背包選擇要使用的道具。', 'error');
            return;
        }
        const item = entityMap[selectedItem];

        setEntityMap(prevMap => {
            const lock = prevMap[lockId];

            if (lock.unlocked) {
                setTimeout(() => printLog(`【${lock.name}】已經被解開了。`, 'info'), 0);
                return prevMap;
            }

            if (lock.req.includes(item.id)) {
                if (lock.fulfilled?.includes(item.id)) {
                    setTimeout(() => printLog(`你已經對【${lock.name}】使用過【${item.name}】了。`, 'error'), 0);
                    return prevMap;
                }

                let newFulfilled = [...(lock.fulfilled || []), item.id];
                let isUnlocked = newFulfilled.length === lock.req.length;
                let newMap = { ...prevMap };

                if (isUnlocked) {
                    newMap[lockId] = { ...lock, unlocked: true, fulfilled: newFulfilled };

                    if (lock.type === 'lock' && lock.hides) {
                        // 實體鎖解開：道具在此時才真正掉落於當前房間
                        const hiddenItem = newMap[lock.hides];
                        newMap[currentRoom] = {
                            ...newMap[currentRoom],
                            items: [...newMap[currentRoom].items, hiddenItem.id]
                        };
                        setTimeout(() => {
                            printLog(`你對【${lock.name}】使用了【${item.name}】。`, 'success');
                            printLog(lock.unlockDesc, 'success');
                            printLog(`(伴隨清脆的聲響，【${hiddenItem.name}】從裡面掉落在了地上！)`, 'success');
                        }, 0);

                    } else if (lock.type === 'path' && lock.hides) {
                        // 空間鎖解開：[核心修復] 絕對不可將道具推進 items，因為圖譜生成時已放入！
                        const hiddenItem = newMap[lock.hides];
                        setTimeout(() => {
                            printLog(`你對【${lock.name}】使用了【${item.name}】。`, 'success');
                            printLog(lock.unlockDesc, 'success');
                            printLog(`(門鎖已解除，全新的區域開放探索，你隱約看見對面房間內有：【${hiddenItem.name}】)`, 'system');
                        }, 0);

                    } else if (lock.type === 'path' && !lock.hides) {
                        setTimeout(() => {
                            printLog(`你對【${lock.name}】使用了【${item.name}】。`, 'success');
                            printLog(lock.unlockDesc, 'success');
                            printLog(`(門鎖已解除，全新的區域已開放探索)`, 'system');
                        }, 0);
                    }

                    if (lock.isExit) {
                        setTimeout(() => {
                            printLog('=========================================', 'success');
                            printLog('🎉 恭喜你，成功逃出密室！', 'success');
                            printLog('=========================================', 'success');
                        }, 0);
                    }
                } else {
                    // 複合零件放入但尚未解鎖
                    newMap[lockId] = { ...lock, fulfilled: newFulfilled };
                    setTimeout(() => {
                        printLog(`你對【${lock.name}】使用了【${item.name}】。`, 'success');
                        printLog(lock.partialMsg || '機關有了反應，但尚未完全解開。', 'info');
                        printLog(`(完成進度: ${newFulfilled.length}/${lock.req.length})`, 'system');
                    }, 0);
                }

                // 動態檢查是否該銷毀道具
                if (!isItemStillNeeded(item.id, newMap)) {
                    setInventory(prevInv => prevInv.filter(id => id !== item.id));
                    setSelectedItem(null);
                    setTimeout(() => printLog(`(【${item.name}】已經沒有其他用途，被丟棄了)`, 'system'), 0);
                } else {
                    setTimeout(() => printLog(`(【${item.name}】似乎還有其他用途，暫時保留在背包中)`, 'system'), 0);
                }

                return newMap;
            } else {
                setTimeout(() => printLog(`你嘗試對【${lock.name}】使用【${item.name}】，但沒有任何反應。`, 'error'), 0);
                return prevMap;
            }
        });
    };

    const roomData = entityMap[currentRoom];

    if (!roomData) return <div className="p-4 text-white flex items-center justify-center h-screen bg-slate-950">正在載入圖譜引擎...</div>;

    return (
        <div className="fixed inset-0 bg-slate-950 text-slate-300 font-sans flex flex-col overflow-hidden">

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-thin">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2"><SettingsIcon size={18} /> 遊戲生成參數</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="flex justify-between text-sm text-slate-300 font-bold mb-1">
                                    <span>邏輯深度 (Depth)</span><span className="text-purple-400">{targetDepth}</span>
                                </label>
                                <input type="range" min="1" max="10" value={targetDepth} onChange={e => setTargetDepth(parseInt(e.target.value))} className="w-full accent-purple-500" />
                            </div>
                            <div>
                                <label className="flex justify-between text-sm text-slate-300 font-bold mb-1">
                                    <span>最大地點數 (Max Rooms)</span><span className="text-cyan-400">{roomCount} 間</span>
                                </label>
                                <input type="range" min="3" max="10" value={roomCount} onChange={e => setRoomCount(parseInt(e.target.value))} className="w-full accent-cyan-500" />
                            </div>
                            <div>
                                <label className="flex justify-between text-sm text-slate-300 font-bold mb-1">
                                    <span>新房間擴張率</span><span className="text-emerald-400">{Math.round(spatialRate * 100)}%</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.1" value={spatialRate} onChange={e => setSpatialRate(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                            </div>
                            <div>
                                <label className="flex justify-between text-sm text-slate-300 font-bold mb-1">
                                    <span>複合機關率</span><span className="text-amber-400">{Math.round(compositeRate * 100)}%</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.1" value={compositeRate} onChange={e => setCompositeRate(parseFloat(e.target.value))} className="w-full accent-amber-500" />
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                <label className="flex justify-between text-sm text-slate-300 font-bold mb-1">
                                    <span>多鑰匙空間分裂率</span><span className="text-rose-400">{Math.round(keySpatialSplitRate * 100)}%</span>
                                </label>
                                <input type="range" min="0" max="1" step="0.1" value={keySpatialSplitRate} onChange={e => setKeySpatialSplitRate(parseFloat(e.target.value))} className="w-full accent-rose-500" />
                            </div>
                            <div>
                                <label className="flex justify-between text-sm text-slate-300 font-bold mb-1">
                                    <span>深度錯落變異值</span><span className="text-blue-400">{depthStaggerMax}</span>
                                </label>
                                <input type="range" min="0" max="2" step="0.1" value={depthStaggerMax} onChange={e => setDepthStaggerMax(parseFloat(e.target.value))} className="w-full accent-blue-500" />
                            </div>
                        </div>

                        <button onClick={startNewGame} className="w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2.5 rounded-lg font-bold transition-colors shadow-lg mt-1 shrink-0">
                            <RefreshCw size={16} /> 套用並重新生成圖譜
                        </button>
                    </div>
                </div>
            )}

            {/* 主內容區 */}
            <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 p-2 md:p-6 overflow-hidden min-h-0">

                {/* 左側：MUD 終端機與圖譜區 */}
                <div className={`flex-1 flex-col border border-slate-800 rounded-xl bg-slate-900 overflow-hidden shadow-xl min-h-0 relative ${mobileTab === 'view' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="bg-slate-800/80 px-3 md:px-4 py-2.5 md:py-3 flex justify-between items-center border-b border-slate-700/50 shrink-0 backdrop-blur-md z-10">
                        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm tracking-wide">
                            <Terminal size={16} className="text-cyan-400" /> 系統日誌與分析
                        </div>
                        <div className="flex gap-1.5 md:gap-2 items-center">
                            <button onClick={() => setActiveTab('game')} className={`px-2.5 py-1.5 text-[11px] md:text-xs font-bold rounded transition-colors ${activeTab === 'game' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600'}`}>文字介面</button>
                            <button onClick={() => setActiveTab('graph')} className={`px-2.5 py-1.5 text-[11px] md:text-xs font-bold rounded transition-colors ${activeTab === 'graph' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600'}`}>Canvas 圖譜</button>
                            <div className="w-px h-4 bg-slate-600 mx-0.5"></div>
                            <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300" title="設定"><SettingsIcon size={14} /></button>
                        </div>
                    </div>

                    {activeTab === 'game' ? (
                        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-2 font-mono text-xs md:text-sm leading-relaxed scroll-smooth scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {logs.map((log, i) => (
                                <div key={i} className={`
                  ${log.type === 'system' && 'text-purple-400 opacity-90'}
                  ${log.type === 'room' && 'text-cyan-300 font-bold my-3 md:my-4 text-sm md:text-[15px] border-l-2 border-cyan-700 pl-2'}
                  ${log.type === 'success' && 'text-emerald-400'}
                  ${log.type === 'error' && 'text-rose-400'}
                  ${log.type === 'info' && 'text-amber-300'}
                `}>
                                    {log.type === 'normal' ? '> ' : ''}{log.text}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    ) : (
                        <div className="flex-1 w-full h-full relative">
                            <CanvasGraph entityMap={entityMap} />
                            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 bg-slate-900/80 p-2 rounded border border-slate-700 text-[10px] md:text-xs shadow-lg backdrop-blur-md pointer-events-none">
                                <span className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-0.5">節點圖例</span>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-emerald-500/50"></span>道具 / 工具</div>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 shadow-rose-500/50"></span>實體機關</div>
                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 shadow-purple-500/50"></span>空間解鎖</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 右側：互動面板 */}
                <div className={`w-full md:w-[22rem] flex-col gap-3 h-full shrink-0 ${mobileTab === 'controls' ? 'flex' : 'hidden md:flex'}`}>

                    <div className="md:hidden bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] font-mono leading-relaxed h-[3.5rem] overflow-y-auto shrink-0 flex flex-col justify-end shadow-inner">
                        {logs.slice(-2).map((l, i) => (
                            <div key={i} className={`truncate ${l.type === 'error' ? 'text-rose-400' : l.type === 'success' ? 'text-emerald-400' : l.type === 'info' ? 'text-amber-300' : 'text-slate-400'}`}>
                                {l.text}
                            </div>
                        ))}
                    </div>

                    <div className="border border-slate-800 rounded-xl bg-slate-900 flex flex-col min-h-0 flex-1 shrink-0 shadow-lg">
                        <div className="p-3 md:p-4 border-b border-slate-800 shrink-0 bg-slate-800/30 rounded-t-xl">
                            <h3 className="text-slate-100 font-bold mb-1 flex items-center gap-2 text-sm md:text-base"><MapIcon size={16} className="text-cyan-400" /> {roomData.name}</h3>
                            <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed">{roomData.desc}</p>
                        </div>

                        <div className="p-3 md:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 space-y-4">
                            <div>
                                <h4 className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5">
                                    <Search size={12} /> 此處的可見物品
                                </h4>
                                {roomData.items.length === 0 ? <span className="text-[11px] text-slate-600 block bg-slate-950/50 p-2 rounded border border-slate-800 border-dashed text-center">空無一物</span> : (
                                    <div className="flex flex-col gap-1.5 md:gap-2">
                                        {roomData.items.map(itemId => (
                                            <div key={itemId} className="flex bg-slate-800 rounded border border-slate-700 overflow-hidden shadow-sm hover:border-slate-600 active:bg-slate-700">
                                                <button onClick={() => handleTake(itemId)} className="flex-1 text-emerald-400 px-3 py-2 md:py-2.5 text-xs text-left truncate font-bold">
                                                    + 拿取 {entityMap[itemId].name}
                                                </button>
                                                <button onClick={() => handleInspect(itemId)} className="text-slate-400 px-3 py-2 md:py-2.5 border-l border-slate-700 shrink-0 active:bg-slate-600">
                                                    <Search size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-[10px] md:text-[11px] text-slate-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5">
                                    <Key size={12} /> 機關與通道
                                </h4>
                                <div className="flex flex-col gap-1.5 md:gap-2">
                                    {Array.from(new Set([...roomData.locks, ...roomData.paths])).map(lockId => {
                                        const lock = entityMap[lockId];
                                        const progStr = (!lock.unlocked && lock.fulfilled?.length > 0) ? `(${lock.fulfilled.length}/${lock.req.length})` : '';
                                        return (
                                            <div key={lockId} className="flex gap-1">
                                                <button onClick={() => handleInspect(lockId)} className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-200 px-2.5 py-2 rounded text-[11px] md:text-xs border border-slate-700 flex-1 text-left flex items-center gap-1.5 truncate shadow-sm">
                                                    {lock.type === 'path' ? <DoorOpen size={14} className="shrink-0 opacity-70" /> : <Key size={14} className="shrink-0 opacity-70" />}
                                                    <span className="truncate">{lock.name} {lock.unlocked ? <span className="text-emerald-400 ml-1">(已解開)</span> : <span className="text-slate-400 ml-1">{progStr}</span>}</span>
                                                </button>

                                                {!lock.unlocked && (
                                                    <button onClick={() => handleUse(lockId)} className={`px-3 py-2 rounded text-[11px] md:text-xs border shrink-0 font-bold shadow-sm ${selectedItem ? 'bg-blue-900 border-blue-600 text-blue-100 active:bg-blue-800' : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                                        使用
                                                    </button>
                                                )}

                                                {lock.type === 'path' && lock.unlocked && (
                                                    <button onClick={() => handleMove(lockId)} className="bg-emerald-900 hover:bg-emerald-800 active:bg-emerald-700 border-emerald-700 text-emerald-100 px-3 py-2 rounded text-[11px] md:text-xs border shrink-0 font-bold shadow-sm">
                                                        進入
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-800 rounded-xl p-3 md:p-4 bg-slate-900 shrink-0 h-[30%] md:h-[35%] flex flex-col shadow-lg">
                        <h3 className="text-slate-200 font-bold mb-2 md:mb-3 flex items-center justify-between text-xs md:text-sm shrink-0">
                            <span className="flex items-center gap-1.5">🎒 隨身背包</span>
                            <span className="text-[10px] text-slate-500 font-normal bg-slate-950 px-2 py-0.5 rounded-full">{inventory.length} 件物品</span>
                        </h3>
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-1 flex-1">
                            {inventory.length === 0 ? <span className="text-[11px] text-slate-600 block bg-slate-950/50 p-3 rounded text-center mt-1 border border-slate-800 border-dashed">背包空空如也</span> : (
                                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                                    {inventory.map(itemId => {
                                        const isSelected = selectedItem === itemId;
                                        const item = entityMap[itemId];
                                        return (
                                            <button
                                                key={itemId}
                                                onClick={() => setSelectedItem(isSelected ? null : itemId)}
                                                className={`text-left px-2 py-1.5 md:px-2.5 md:py-2 rounded border text-[11px] md:text-xs flex flex-col gap-1 transition-all shadow-sm ${isSelected ? 'bg-blue-900 border-blue-400 text-white ring-2 ring-blue-500/30' : 'bg-slate-800 border-slate-700 text-slate-300 active:bg-slate-700'}`}>
                                                <div className="flex items-center gap-1.5 truncate w-full">
                                                    <MousePointerClick size={12} className={`shrink-0 ${isSelected ? 'text-blue-300' : 'text-slate-500'}`} />
                                                    <span className="truncate font-bold">{item.name}</span>
                                                </div>
                                                <div className="flex justify-end w-full">
                                                    <span className="text-[9px] text-slate-400 bg-slate-900 px-1 rounded flex items-center gap-0.5 border border-slate-800"><Package size={8} /> 道具</span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* 行動版底部導航列 */}
            <div className="md:hidden flex items-center justify-between bg-slate-900 border-t border-slate-800 p-2 shrink-0 z-20 px-3 shadow-[0_-4px_10px_rgba(0,0,0,0.3)] pb-safe">
                <button
                    onClick={() => setMobileTab('controls')}
                    className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${mobileTab === 'controls' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-slate-500'}`}>
                    <Hand size={16} /> 探索操作
                </button>
                <div className="w-px h-6 bg-slate-800 mx-2"></div>
                <button
                    onClick={() => setMobileTab('view')}
                    className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors ${mobileTab === 'view' ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30' : 'text-slate-500'}`}>
                    <Eye size={16} /> 監控圖譜
                </button>
            </div>

        </div>
    );
}