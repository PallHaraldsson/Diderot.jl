var documenterSearchIndex = {"docs":
[{"location":"#Diderot.jl-1","page":"Diderot.jl","title":"Diderot.jl","text":"","category":"section"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"CurrentModule = Diderot","category":"page"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"Diderot","category":"page"},{"location":"#Diderot.Diderot","page":"Diderot.jl","title":"Diderot.Diderot","text":"Diderot.jl\n\nDecision Diagrams for Discrete Optimization in Julia.\n\n(Image: ) (Image: ) (Image: Build Status) (Image: Codecov)\n\nProvides a generic implementation of decisision diagrams (top-down construction of layered state transition graph). Implements a branch-and-bound algorithms with subproblems defined by nodes in an exact cutset of the diagram.\n\nTo support new problem classes, the several methods have to be implemented that are dispatched on the user-defined types for the instance, describing the states and transition functions.\n\nThe solver behavior (restrictions, relaxations, variable order, diagram width) can also be fully customized through user-defined layer processing.\n\nMotivation\n\nThe package is mostly written as a learning experiment. Implementing an idea gives a deeper understanding of the challenges than just reading about it.\n\nThe appeal of decision diagrams for discrete optimization is two-fold:\n\nThe simplicity of the algorithm makes implementation from scratch a reasonable endeavor.\nIt seems that the DD-based branch-and-bound lends itself to parallelization, yielding better speed-ups than MIP solvers.\n\nLimitations\n\nThis is (still) mostly a naive text book implementation. I'm sure there's room for improvement in the choice of data structures and avoing frequent allocation.\n\nIt's currently assumed that the objective function is to be maximized, and the transition values are combined by addition. That is, we're looking for a longest path in the diagram, using as arc weights the values of the transitions. In principle, one could also choose minimization or use another operator (multiplication, maximum), but this would require even more type parametrization.\n\nThe decision diagram does not keep all transition arcs, but computes the longest path on the fly. That is, after a new layer is created, each node only remembers a single ingoing arc. This simplification works OK for the purpose of finding an optimal solution, but it rules out other use cases, such as enumeration of feasible solutions or post-optimality analysis.\n\nProblem Classes\n\nModels and methods for some specific problem classes are also implemented in the context of this package as submodules. The main motivation is test-driving the current API, to make sure it's sufficiently general and not too verbose.\n\nCurrently included are:\n\nBinary Knapsack Problem.\nSet Cover Problem.\nIndex Fund Construction (as defined in Optimization Methods in Finance)\n\nReferences\n\nThe implementation is informed by the book Decision Diagrams for Optimization by D Bergman, A Cire, WJ van Hoeve and J Hooker.\n\nThe MDD website also contains a lot of valuable resources, in particular the INFORMS article Discrete Optimization with Decision Diagrams.\n\nContributions\n\nPull requests with various forms of contributions are very welcome. In particular, I would appreciate suggestions to simplify the current interface, improve overall performance or cover more problem classes.\n\n\n\n\n\n","category":"module"},{"location":"#Types-1","page":"Diderot.jl","title":"Types","text":"","category":"section"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"The type parameters specify the (user-defined) State, variable Domain and objective Value, respectively.","category":"page"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"Arc\nNode\nLayer\nDiagram\nSolution\nSubproblem","category":"page"},{"location":"#Diderot.Arc","page":"Diderot.jl","title":"Diderot.Arc","text":"Arc{S,D,V}\n\nAn arc in the decision diagram, representing a state transition.\n\nIt points to the original/previous state and also stores the decision made (variable assignment) as well as the contribution to the objective function.\n\n\n\n\n\n","category":"type"},{"location":"#Diderot.Node","page":"Diderot.jl","title":"Diderot.Node","text":"Node{S,D,V}\n\nMeta-data for a node in the decision diagram.\n\nStores the distance from the root node on the longest path so far, the ingoing arc on such a path (but no other ingoing arcs) and a flag to specify whether the state is exact, as opposed to relaxed.\n\n\n\n\n\n","category":"type"},{"location":"#Diderot.Layer","page":"Diderot.jl","title":"Diderot.Layer","text":"Layer{S,D,V}\n\nA layer of nodes in the decision diagram.\n\nRepresented by mapping from (user-defined) states to the Node meta-data. Also has a flag exact to indicate whether all states are represented exactly (neither restricted nor relaxed).\n\n\n\n\n\n","category":"type"},{"location":"#Diderot.Diagram","page":"Diderot.jl","title":"Diderot.Diagram","text":"Diagram{S,D,V}\n\nA (multi-valued) decision diagram.\n\nIt's a directed acyclic graph where the nodes represent (feasible) states and the arcs transitions triggered by decision variable assignments. Decisions are made sequentially and arcs only connect consecutive layers. The initial layer contains the single, given root node. All nodes in the final layer are merged to a single terminal node.\n\nAs the variable order can be defined dynamically, the variable indices are also stored. Note that the constructed diagram will have N+1 layers for N variables.\n\nThere is also a property partial_sol containing indices of variables that are already assigned outside this diagram (in the context of branch-and-bound).\n\n\n\n\n\n","category":"type"},{"location":"#Diderot.Solution","page":"Diderot.jl","title":"Diderot.Solution","text":"Solution{D,V}\n\nA feasible solution, with decisions for all variables (in order) and the objective values.\n\n\n\n\n\n","category":"type"},{"location":"#Diderot.Subproblem","page":"Diderot.jl","title":"Diderot.Subproblem","text":"Subproblem{D,V}\n\nA subproblem in the context of branch-and-bound, as defined by an exact node in the diagram. It's represented by the partial solution given by a longest path from the root that node and the current state.\n\n\n\n\n\n","category":"type"},{"location":"#Modeling-Interface-1","page":"Diderot.jl","title":"Modeling Interface","text":"","category":"section"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"initial_state\ndomain_type\nvalue_type\nnext_variable\ntransitions\nprocess","category":"page"},{"location":"#Diderot.initial_state","page":"Diderot.jl","title":"Diderot.initial_state","text":"initial_state(instance)\n\nInitial state for a given instance (used for root node).\n\n\n\n\n\n","category":"function"},{"location":"#Diderot.domain_type","page":"Diderot.jl","title":"Diderot.domain_type","text":"domain_type(instance)\n\nThe type used as domain for the decision variables.\n\n\n\n\n\n","category":"function"},{"location":"#Diderot.value_type","page":"Diderot.jl","title":"Diderot.value_type","text":"value_type(instance)\n\nThe (numeric) type used in the objective function.\n\n\n\n\n\n","category":"function"},{"location":"#Diderot.next_variable","page":"Diderot.jl","title":"Diderot.next_variable","text":"next_variable(instance, diagram::Diagram{S,D,V}, variable_order)::Int\n\nThe variable to build the next layer, as an integer index.\n\nOptional: Defaults to order 1:length(instance).\n\nMultiple strategies can be implemented for an instance type by defining and passing objects as variable_order.\n\nThe (work-in-progress) diagram is also passed and can be queried about already assigned variables or the nodes & states of the last layer.\n\n\n\n\n\n","category":"function"},{"location":"#Diderot.transitions","page":"Diderot.jl","title":"Diderot.transitions","text":"transitions(instance, state, variable::Int)::Dict{Arc{S,D,V},S}\n\nAll feasible transitions from the given state by any assignment in the variable's domain.\n\nArcs specify the original state, the variable assignment and the contribution the objective and are mapped to the new state.\n\n\n\n\n\n","category":"function"},{"location":"#Diderot.process","page":"Diderot.jl","title":"Diderot.process","text":"process(processing, layer::Layer{S,D,V})::Layer{S,D,V}\n\nBuild a new layer by processing the nodes of the given layer.\n\nFor restrictions, this could mean simply selecting a subset of the nodes, to stay within the width limit.\n\nFor relaxations, new nodes are created by merging existing nodes (and setting exact=false).\n\nOptional: Defaults to identity.\n\n\n\n\n\n","category":"function"},{"location":"#Usage-1","page":"Diderot.jl","title":"Usage","text":"","category":"section"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"Solving an instance by branch-and-bound.","category":"page"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"solution = branch_and_bound(instance, restrict=Restrict(), relax=Relax())","category":"page"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"branch_and_bound","category":"page"},{"location":"#Diderot.branch_and_bound","page":"Diderot.jl","title":"Diderot.branch_and_bound","text":"branch_and_bound(instance; restrict, relax, variable_order)\n\nSolve given instance using branch-and-bound. For each subproblem, a restriction is computed to update the incumbent. Then a relaxation is computed. If the problem can not be pruned from the relaxation bound, new subproblems are created from an exact cutset in the relaxation's diagram.\n\n\n\n\n\n","category":"function"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"Solving an instance with a single exact diagram:","category":"page"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"diagram = Diagram(instance)\ntop_down!(diagram, instance)\nsolution = longest_path(diagram)","category":"page"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"Similarly, a single restriction or relaxation can be computed.","category":"page"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"top_down!\nlongest_path","category":"page"},{"location":"#Diderot.top_down!","page":"Diderot.jl","title":"Diderot.top_down!","text":"top_down!(diagram::Diagram{S,D,V}, instance; variable_order, processing)\n\nBuild a decision diagram for given instance. It is developed layer by layer, from the top, by following the state transitions. The first layer with a single root node should already be present in the diagram.\n\nWithout any layer processing, the diagram will be exact, that is will contain a path representing an optimal solution.\n\nRestrictions or relaxations are achieved by dropping or merging the nodes and states in each layer.\n\n\n\n\n\n","category":"function"},{"location":"#Diderot.longest_path","page":"Diderot.jl","title":"Diderot.longest_path","text":"longest_path(diagram::Diagram{S,D,V})\n\nExtract optimal solution by following a longest path from root to terminal.\n\n\n\n\n\n","category":"function"},{"location":"#Generic-Implementation-1","page":"Diderot.jl","title":"Generic Implementation","text":"","category":"section"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"TBD","category":"page"},{"location":"#Internals-1","page":"Diderot.jl","title":"Internals","text":"","category":"section"},{"location":"#","page":"Diderot.jl","title":"Diderot.jl","text":"TBD","category":"page"}]
}