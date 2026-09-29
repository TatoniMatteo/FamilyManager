import {type CSSProperties, useMemo, useState} from 'react'
import dagre from '@dagrejs/dagre'
import {
    Background,
    BaseEdge,
    Controls,
    type Edge,
    type EdgeProps,
    Handle,
    MarkerType,
    MiniMap,
    type Node,
    type NodeProps,
    Position,
    ReactFlow,
} from '@xyflow/react'
import type {PersonResponse, RelationshipResponse} from '../api/models'
import type {HouseholdResponse} from '../api/models/householdResponse'
import {getAvatarForPerson, getGenderCategory} from '../utils/avatar'
import {useI18n} from '../context/I18nContext'

interface PersonNodeData extends Record<string, unknown> {
    person: PersonResponse
    selected: boolean
    households: Array<{ id: string; name: string; color: string }>
}

type FamilyNode = Node<PersonNodeData, 'familyPerson'>

interface FamilyTreeCanvasProps {
    allPersons: PersonResponse[]
    households: HouseholdResponse[]
    relationships: RelationshipResponse[]
    selectedPersonId: string | null
    relationshipError: string | null
    onSelectPerson: (id: string) => void
    onAddPerson: () => void
    canAddPerson: boolean
}

function FamilyPersonNode({data, isConnectable}: NodeProps<FamilyNode>) {
    const person = data.person
    const label = person.displayName?.trim() || 'Persona senza nome'
    return <>
        <div
            className={`family-flow-person ${data.selected ? 'selected' : ''} gender-${getGenderCategory(person.gender)}`}>
            <img src={getAvatarForPerson(label, person.gender)} alt=""/>
            <span className="family-flow-person-copy">
        <strong>{label}</strong>
                {person.birthDate && <small>{person.birthDate}</small>}
                {data.households.length > 0 &&
                    <span className="family-flow-household-badges">{data.households.map((household) => <small
                        key={household.id}
                        style={{'--household-color': household.color} as CSSProperties}>{household.name}</small>)}</span>}
      </span>
        </div>
        <Handle id="top-source" type="source" position={Position.Top} isConnectable={isConnectable}/>
        <Handle id="top-target" type="target" position={Position.Top} isConnectable={isConnectable}/>
        <Handle id="bottom-source" type="source" position={Position.Bottom} isConnectable={isConnectable}/>
        <Handle id="bottom-target" type="target" position={Position.Bottom} isConnectable={isConnectable}/>
        <Handle id="left-source" type="source" position={Position.Left} isConnectable={isConnectable}/>
        <Handle id="left-target" type="target" position={Position.Left} isConnectable={isConnectable}/>
        <Handle id="right-source" type="source" position={Position.Right} isConnectable={isConnectable}/>
        <Handle id="right-target" type="target" position={Position.Right} isConnectable={isConnectable}/>
    </>
}

const nodeTypes = {familyPerson: FamilyPersonNode}
type RoutedEdge = Edge<{ points: Array<{ x: number; y: number }> }>
const edgeTypes = {familyRouted: RoutedFamilyEdge}
const nodeWidth = 232
const nodeHeight = 92
const householdColors = ['#6750a4', '#087e8b', '#b54708', '#287d3c', '#b4235a', '#3867b2', '#826400', '#8c4a1f']

function RoutedFamilyEdge({id, sourceX, sourceY, targetX, targetY, data, label, markerEnd}: EdgeProps<RoutedEdge>) {
    const points = data?.points?.length ? data.points : [{x: sourceX, y: sourceY}, {x: targetX, y: targetY}]
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
    const middle = points[Math.floor(points.length / 2)]
    return <BaseEdge id={id} path={path} label={label} labelX={middle.x} labelY={middle.y} markerEnd={markerEnd}/>
}

function relationshipLabel(type: string | undefined, t: (key: string) => string) {
    if (type === 'PARENT_OF') return t('relationship.parent')
    if (type === 'SPOUSE_OF') return t('relationship.spouse')
    if (type === 'PARTNER_OF') return t('relationship.partner')
    if (type === 'SIBLING_OF') return t('relationship.sibling')
    return ''
}

function layoutGraph(persons: PersonResponse[], relationships: RelationshipResponse[], selectedPersonId: string | null, householdNamesByPerson: Map<string, Array<{
    id: string;
    name: string;
    color: string
}>>, t: (key: string) => string) {
    const graph = new dagre.graphlib.Graph()
    graph.setDefaultEdgeLabel(() => ({}))
    graph.setGraph({rankdir: 'TB', ranksep: 86, nodesep: 38, edgesep: 20, marginx: 32, marginy: 30})

    const availablePeople = persons.filter((person): person is PersonResponse & { id: string } => Boolean(person.id))
    const ids = new Set(availablePeople.map((person) => person.id))
    availablePeople.forEach((person) => graph.setNode(person.id, {width: nodeWidth, height: nodeHeight}))

    relationships.filter((relationship) => relationship.type === 'SPOUSE_OF' || relationship.type === 'PARTNER_OF').forEach((relationship) => {
        const first = relationship.personA?.id
        const second = relationship.personB?.id
        if (first && second && ids.has(first) && ids.has(second)) {
            const [left, right] = [first, second].sort()
            // Dagre 3.x non gestisce minlen=0: durante il layout crea archi senza
            // punti e fallisce. Il vincolo di coppia resta pesante per tenerli vicini.
            graph.setEdge(left, right, {weight: 40, minlen: 1})
        }
    })
    const childrenByParent = new Map<string, Set<string>>()
    relationships.forEach((relationship) => {
        if (relationship.type !== 'PARENT_OF') return
        const parentId = relationship.personA?.id
        const childId = relationship.personB?.id
        if (!parentId || !childId || !ids.has(parentId) || !ids.has(childId)) return
        const children = childrenByParent.get(parentId) ?? new Set<string>()
        children.add(childId)
        childrenByParent.set(parentId, children)
    })
    const siblingPairs = new Set<string>()
    childrenByParent.forEach((children) => {
        const siblings = [...children].sort()
        for (let first = 0; first < siblings.length; first += 1) for (let second = first + 1; second < siblings.length; second += 1) {
            const pair = `${siblings[first]}\u0000${siblings[second]}`
            siblingPairs.add(pair)
        }
    })

    relationships.forEach((relationship) => {
        const from = relationship.personA?.id
        const to = relationship.personB?.id
        if (relationship.type === 'PARENT_OF' && from && to && ids.has(from) && ids.has(to)) {
            graph.setEdge(from, to, {weight: 4, minlen: 1})
        }
    })
    dagre.layout(graph)
    const routePoints = (source: string, target: string) => {
        const route = graph.edge(source, target)?.points
        if (route) return route
        return [...(graph.edge(target, source)?.points ?? [])].reverse()
    }

    const nodes: FamilyNode[] = availablePeople.map((person) => {
        const point = graph.node(person.id)
        return {
            id: person.id,
            type: 'familyPerson',
            position: {x: point.x - nodeWidth / 2, y: point.y - nodeHeight / 2},
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            data: {
                person,
                selected: person.id === selectedPersonId,
                households: householdNamesByPerson.get(person.id) ?? []
            },
        }
    })
    const positions = new Map(nodes.map((node) => [node.id, node.position]))
    const pairHandles = (sourceId: string, targetId: string) => {
        const source = positions.get(sourceId)!
        const target = positions.get(targetId)!
        const deltaX = target.x - source.x
        const deltaY = target.y - source.y
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
            return deltaX >= 0
                ? {sourceHandle: 'right-source', targetHandle: 'left-target'}
                : {sourceHandle: 'left-source', targetHandle: 'right-target'}
        }
        return deltaY >= 0
            ? {sourceHandle: 'bottom-source', targetHandle: 'top-target'}
            : {sourceHandle: 'top-source', targetHandle: 'bottom-target'}
    }

    const relationshipEdges: Edge[] = relationships.flatMap((relationship) => {
        const personAId = relationship.personA?.id
        const personBId = relationship.personB?.id
        if (!personAId || !personBId || !ids.has(personAId) || !ids.has(personBId)) return []
        const parentLink = relationship.type === 'PARENT_OF'
        if (!parentLink) return []
        return [{
            id: relationship.id ?? `${personAId}-${relationship.type}-${personBId}`,
            source: personAId,
            target: personBId,
            sourceHandle: 'bottom-source',
            targetHandle: 'top-target',
            type: 'familyRouted',
            data: {points: routePoints(personAId, personBId)},
            label: relationshipLabel(relationship.type, t),
            className: 'family-flow-parent-edge',
            animated: false,
            markerEnd: {type: MarkerType.ArrowClosed, color: 'var(--color-primary)'},
        }]
    })

    // I legami di coppia sono simmetrici: più righe reciproche descrivono un solo collegamento visivo.
    const couplePairTypes = new Map<string, RelationshipResponse>()
    relationships
        .filter((relationship) => relationship.type === 'SPOUSE_OF' || relationship.type === 'PARTNER_OF')
        .sort((first, second) => Number(second.type === 'SPOUSE_OF') - Number(first.type === 'SPOUSE_OF'))
        .forEach((relationship) => {
            const firstId = relationship.personA?.id
            const secondId = relationship.personB?.id
            if (!firstId || !secondId || !ids.has(firstId) || !ids.has(secondId)) return
            const pair = [firstId, secondId].sort().join('\u0000')
            if (!couplePairTypes.has(pair)) couplePairTypes.set(pair, relationship)
        })
    const coupleEdges: Edge[] = [...couplePairTypes].map(([pair, relationship]) => {
        const [personAId, personBId] = pair.split('\u0000')
        const handles = pairHandles(personAId, personBId)
        return {
            id: `couple-${pair}`,
            source: personAId,
            target: personBId,
            ...handles,
            type: 'familyRouted',
            data: {points: routePoints(personAId, personBId)},
            label: relationshipLabel(relationship.type, t),
            className: 'family-flow-spouse-edge',
            animated: false,
        }
    })

    // I legami tra fratelli derivano dai genitori comuni già registrati, senza aggiungere relazioni fittizie al backend.
    const siblingEdges: Edge[] = [...siblingPairs].map((pair) => {
        const [source, target] = pair.split('\u0000')
        return {
            id: `siblings-${source}-${target}`,
            source,
            target,
            ...pairHandles(source, target),
            type: 'familyRouted',
            data: {points: routePoints(source, target)},
            label: relationshipLabel('SIBLING_OF', t),
            className: 'family-flow-sibling-edge',
        }
    })

    const edges = [...relationshipEdges, ...coupleEdges, ...siblingEdges]
    return {nodes, edges}
}

export function FamilyTreeCanvas({
                                     allPersons,
                                     households,
                                     relationships,
                                     selectedPersonId,
                                     relationshipError,
                                     onSelectPerson,
                                     onAddPerson,
                                     canAddPerson
                                 }: FamilyTreeCanvasProps) {
    const {t} = useI18n()
    const [visibleHouseholdIds, setVisibleHouseholdIds] = useState<string[]>([])
    const allHouseholdsVisible = households.length > 0 && visibleHouseholdIds.length === households.length
    const visibleHouseholds = useMemo(
        () => households.filter((household) => visibleHouseholdIds.includes(household.id)),
        [households, visibleHouseholdIds],
    )
    const householdNamesByPerson = useMemo(() => {
        const namesByPerson = new Map<string, Array<{ id: string; name: string; color: string }>>()
        visibleHouseholds.forEach((household) => household.members.forEach(({person}) => {
            if (!person.id) return
            const color = householdColors[households.findIndex((entry) => entry.id === household.id) % householdColors.length]
            namesByPerson.set(person.id, [...(namesByPerson.get(person.id) ?? []), {
                id: household.id,
                name: household.name,
                color
            }])
        }))
        return namesByPerson
    }, [visibleHouseholds, households])
    const {nodes, edges} = useMemo(
        () => layoutGraph(allPersons, relationships, selectedPersonId, householdNamesByPerson, t),
        [allPersons, relationships, selectedPersonId, householdNamesByPerson, t],
    )

    if (!allPersons.length) return <div className="empty-tree-placeholder"><h3>{t('family.noPeople')}</h3>
        <p>{t('family.startTree')}</p>{canAddPerson && <button type="button" className="btn btn-primary"
                                                               onClick={onAddPerson}>{t('family.addFirstPerson')}</button>}
    </div>
    if (!nodes.length) return <div className="empty-tree-placeholder"><h3>{t('family.missingId')}</h3>
        <p>{t('family.cannotPosition')}</p></div>

    return <div className="family-tree-canvas-container family-flow-canvas">
        {households.length > 0 && <fieldset className="family-household-filter">
            <legend>{t('family.householdsTab')}</legend>
            <label className="family-household-show-all"><input type="checkbox" checked={allHouseholdsVisible}
                                                                onChange={(event) => setVisibleHouseholdIds(event.target.checked ? households.map((household) => household.id) : [])}/><strong>{t('family.showAllHouseholds')}</strong></label>
            {households.map((household, index) => <label key={household.id}>
                <input type="checkbox" checked={visibleHouseholdIds.includes(household.id)}
                       onChange={(event) => setVisibleHouseholdIds((current) => event.target.checked ? [...current, household.id] : current.filter((id) => id !== household.id))}/>
                <span className="family-household-color-dot"
                      style={{'--household-color': householdColors[index % householdColors.length]} as CSSProperties}/>
                <span>{household.name}</span><small>{household.members.length}</small>
            </label>)}
        </fieldset>}
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, node) => node.data.person.id && onSelectPerson(node.data.person.id)}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{padding: 0.18, minZoom: 0.35, maxZoom: 1}}
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{hideAttribution: false}}
            aria-label={t('family.graphAria')}
        >
            <Background color="var(--border-color)" gap={24} size={1}/>
            <Controls showInteractive={false}/>
            {nodes.length > 8 && <MiniMap pannable zoomable nodeStrokeWidth={3}/>}
        </ReactFlow>
        <div className="family-flow-caption" aria-live="polite">
            <span>{t('family.personCount', {count: nodes.length})} · {t('family.relationshipCount', {count: edges.length})}</span>
            {relationshipError && <span role="status">{t('relationship.loadError')}</span>}
        </div>
    </div>
}
