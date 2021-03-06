function Base.show(io::IO, diagram::Diagram)
    println(io, "already fixed: ", diagram.partial_sol)
    println(io, "root: ", only(diagram.layers[1]))
    for (l, variable) in enumerate(diagram.variables)
        println(io, "variable: ", variable)
        for pair in diagram.layers[l + 1]
            println(io, " ", pair)
        end
    end
end

function fixed_variables(diagram)
    return vcat(diagram.partial_sol, diagram.variables)
end

function add_transition(layer, new_state, new_node)
    if haskey(layer, new_state)
        if new_node.distance > layer[new_state].distance
            layer[new_state] = new_node
        end
    else
        layer[new_state] = new_node
    end
end

function build_layer(instance, diagram::Diagram{S,D,V}, variable) where {S,D,V}
    layer = Layer{S,D,V}()

    # Collect new states, keep only "best" arcs.
    for (state, node) in diagram.layers[end]
        for (arc, new_state) in transitions(instance, state, variable)
            new_node = Node{S,D,V}(node.distance + arc.value, arc)
            add_transition(layer, new_state, new_node)
        end
    end

    return layer
end

struct InOrder end

function next_variable(instance, diagram, variable_order::InOrder)
    num_variables = length(instance)
    fixed = fixed_variables(diagram)
    for i in 1:num_variables
        if !(i in fixed)  # TODO: efficient!
            return i
        end
    end
    return nothing
end

struct KeepAllNodes end

process(::KeepAllNodes, layer) = layer

"""
    top_down!(diagram::Diagram{S,D,V}, instance; variable_order, processing)

Build a decision diagram for given instance. It is developed layer by layer,
from the top, by following the state transitions. The first layer with a single
root node should already be present in the diagram.

Without any layer processing, the diagram will be exact, that is will contain a
path representing an optimal solution.

Restrictions or relaxations are achieved by dropping or merging the nodes and
states in each layer.
"""
function top_down!(
    diagram::Diagram{S,D,V}, instance;
    variable_order=InOrder(), processing=KeepAllNodes()
) where {S,D,V}
    @assert length(diagram.layers) == 1   # root layer

    # Intermediate layers
    while true
        variable = next_variable(instance, diagram, variable_order)
        if variable === nothing
            break
        end

        layer = build_layer(instance, diagram, variable)
        layer = process(processing, layer)   # restrict/relax

        push!(diagram.layers, layer)
        push!(diagram.variables, variable)
    end

    # Terminal node (last layer reduced to best)
    max_state, max_node = nothing, Node{S,D,V}(typemin(V))
    for (state, node) in diagram.layers[end]
        if node.distance > max_node.distance
            max_state = state
            max_node = node
        end
    end
    diagram.layers[end] = Layer{S,D,V}(Dict(max_state => max_node))
end

"""
    longest_path(diagram::Diagram{S,D,V})

Extract optimal solution by following a longest path from root to terminal.
"""
function longest_path(diagram::Diagram{S,D,V}) where {S,D,V}
    # Collect path in reverse, from terminal to root.
    terminal = only(values(diagram.layers[end].nodes))
    num_variables = length(diagram.partial_sol) + length(diagram.variables)
    decisions = Vector{D}(undef, num_variables)
    node, depth = terminal, length(diagram.layers) - 1
    while depth != 0
        decisions[diagram.variables[depth]] = node.inarc.decision
        state = node.inarc.tail
        node = diagram.layers[depth][state]
        depth -= 1
    end

    return Solution(decisions, terminal.distance)
end

function last_exact_layer(diagram)
    for (l, layer) in enumerate(diagram.layers)
        if !layer.exact
            # Current layer has at least one relaxed node.
            @assert l > 1

            # Return previous layer (all exact)
            return l - 1
        end
    end
    # If we reached the end then even the terminal layer is exact.
    return len(diagram.layers)
end

# TODO: pass solver object to store options, statistics, results?
"""
    branch_and_bound(instance; restrict, relax, variable_order)

Solve given instance using branch-and-bound. For each subproblem, a restriction
is computed to update the incumbent. Then a relaxation is computed. If the
problem can not be pruned from the relaxation bound, new subproblems are created
from an exact cutset in the relaxation's diagram.
"""
function branch_and_bound(instance; restrict, relax, variable_order=InOrder())
    state = initial_state(instance)
    S = typeof(state)
    D = domain_type(instance)
    V = value_type(instance)
    original_problem = Subproblem(Int[], D[], zero(V), state)

    # Assume maximization problems, so relaxation provides upper bound.
    # Following the book, we will use a node's distance (from root) as priority
    # and pick the smallest. This corresponds to picking nodes that are on early
    # layers?!
    #
    # TODO: turn this into a configurable strategy.
    problems = PriorityQueue(original_problem => zero(V))
    incumbent = Solution(D[], typemin(V))

    # Solve subproblems, one at a time.
    while !isempty(problems)
        current = dequeue!(problems)

        root_layer = Layer{S,D,V}(
            Dict(current.state => Node{S,D,V}(current.distance)))

        # solve restriction
        diagram = Diagram{S,D,V}(current.variables, [root_layer], [])
        top_down!(diagram, instance,
                  variable_order=variable_order, processing=restrict)
        solution = longest_path(diagram)

        # update incumbent
        if solution.objective > incumbent.objective
            for (variable, decision) in zip(current.variables, current.decisions)
                solution.decisions[variable] = decision
            end
            incumbent = solution
        end

        # have we solved the subproblem already?
        if all(l -> l.exact, diagram.layers)
            continue
        end

        # solve relaxation
        diagram = Diagram{S,D,V}(current.variables, [root_layer], [])
        top_down!(diagram, instance;
                  variable_order=variable_order, processing=relax)
        solution = longest_path(diagram)

        # create subproblems if not pruned
        if solution.objective > incumbent.objective
            cutset = last_exact_layer(diagram)
            @assert length(diagram.layers[cutset]) > 1
            for (sub_state, sub_node) in diagram.layers[cutset]
                depth = cutset - 1
                new_decisions = Vector{D}(undef, depth)
                node = sub_node
                while depth != 0
                    new_decisions[depth] = node.inarc.decision
                    state = node.inarc.tail
                    node = diagram.layers[depth][state]
                    depth -= 1
                end

                variables = vcat(current.variables,
                                 diagram.variables[1:cutset - 1])
                decisions = vcat(current.decisions, new_decisions)

                subproblem = Subproblem(variables, decisions,
                                        sub_node.distance, sub_state)
                problems[subproblem] = subproblem.distance
            end
        end
    end

    return incumbent
end
