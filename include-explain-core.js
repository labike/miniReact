/**
 * 描述DOM节点和元素
 */
{
    "type": "ul",
    "props": {
        "className": "ul-list"
    },
    "children": [
        {
            "type": "li",
            "props": {
                "className": "single-li"
            },
            "children": [
                "First"
            ]
        },
        {
            "type": "li",
            "props": {
                "className": "single-li"
            },
            "children": [
                "Second"
            ]
        }
    ]
}

/**
 * JSX创建节点和元素
 */
const list = `
    <ul className="ul-list>
        <li className="single-li" key="First">First</li>
        <li className="single-li" key="Second">Second</li>
    </ul>
`
const list = createElement(
    "ul",
    {
        className: "ul-list"
    },
        createElement(
            "li",
            {
                className: "single-li",
            },
            "children": [
                "First"
            ]
        ),
        createElement(
            "li",
            {
                className: "single-li",
            },
            "children": [
                "Second"
            ] 
        )
)

/**
 * createElement方法
 */
const createElement = (type, props, ...children) => {
    if(props === null) props = {}
    return {type, props, ...children}
}

/**
 * rendering渲染真实的dom
 */
const render = (vdom, parent=null) => {
    /**
     * 创建mount方法, 该方法根据vdom的类型渲染出不同类型的组件
     */
    const mount = parent ? (el => parent.appendChild(el)) : (el => el)

    if(typeof vdom === 'string' || typeof vdom === 'number'){
        return mount(document.createTextNode(vdom))
    }else if(typeof vdom === 'boolean' || vdom === null){
        return mount(document.createTextNode(''))
    }else if(typeof vdom === 'object' && typeof vdom.type === 'function'){
        return Component.render(vdom, parent)
    }else if(typeof vdom === 'object' && typeof vdom.type === 'string'){
        /**
         * {
         *   type: 'ul',
         *   props: {
         *     className: 'ul-list'
         *   },
         *   children: [
         *     {}
         *   ]
         * }
         * 参照上面VDOM解构理解下面如何渲染出真实的DOM
         * 根据vdom的类型创建dom并且渲染出子节点同时设置属性值
         */
        const dom = mount(document.createElement(vdom.type))

        for(const child of [].concat(...vdom.children)){
            render(child, dom)
        }

        for(const prop in vdom.props){
            setAttribute(dom, prop, vdom.props[prop])
        }

        return dom
    }else{
        throw new Error(`Invalid vdom: ${vdom}`)
    }
}

/**
 * 属性设置
 * 我们的节点或元素有一些属性, 像:
 * @ 事件处理属性 onClick, onChange etc.
 * @ style属性 
 * @ ref属性
 * @ 其他属性
 */
const setAttribute = (dom, key, value) => {
    /**
     * @msg: 处理事件类型
     * @param {type} event
     * @return: onClick, onchange etc.
     */
    if(typeof value === 'function' && key.startsWith('on')){
        const eventType = key.slice(2).toLowerCase()

        dom.__handlerEvents = dom.__handlerEvents || {}
        dom.removeEventListener(eventType, dom.__handlerEvents[eventType])
        dom.__handlerEvents[eventType] = value
        dom.addEventListener(eventType, dom.__handlerEvents[eventType])
    }else if(key === 'checked' || key === 'value' || key === 'className'){
        dom[key] = value
    }else if(key === 'style' && typeof value === 'object'){
        Object.assign(dom.style, value)
    }else if(key === 'ref' && typeof value === 'function'){
        value(dom)
    }
}

/**
 * patching方法是非常非常重要的 
 * 因为React正是用它将VDOM和DOM之间存在差异的DOM元素和节点更新到真实的DOM树上的
 * 最后由render渲染到页面上
 */
const patch = (dom, vdom, parent=dom.parentNode) => {
    /**
     * 首先我们创建一个replace方法, 用它替换掉旧节点或元素(直接删掉旧节点创建新节点)
     */
    const replace = parent ? el => (parent.replaceChild(el, dom) && el) : (el => el)

    if(typeof vdom === 'object' && typeof vdom.type === 'function'){
        return Component.patch(dom, vdom, parent)
    }else if(typeof vdom !== 'object' && dom instanceof Text){
        /**
         * 如果VDOM不是object(它可能是textNode或空节点), 而DOM是文本, 我们在渲染的时候要判断内容;
         * 如果发生变化就重新渲染, 否则的话就直接返回原内容
         */
        return dom.textContent !== vdom ? replace(render(vdom, parent)) : dom
    }else if(typeof vdom === 'object' && dom instanceof Text){
        /**
         * 如果VDOM是object, DOM是文本, 说明vdom和dom的类型不同, 所以直接用新的dom替换掉旧dom
         */
        return repalce(render(vdom, parent))
    }else if(typeof vdom === 'object' && dom.nodeName !== vdom.type.toUpperCase()){
        /**
         * 如果VDOM和DOM节点名不一样, 直接渲染新的节点及其内容
         */
        return replace(render(vdom, parent))
    }else if(typeof vdom === 'object' && dom.nodeName === vdom.type.toUpperCase()){
        /**
         * 如果VDOM和DOM节点名一样则看是否有子节点或元素, 然后对子节点或元素进行patch
         * 并且我们可以根据节点或元素的key来判断是否要更新
         * 这其实也就是React中key的作用.
         */
        const pool = {}
        const active = document.activeElement()

        [].concat(...dom.childNodes).map((child, index) => {
            const key = child.__handlerKey || `__index_${index}`
            pool[key] = child
        })

        [].concat(...vdom.children).map((child, index) => {
            const key = child.props && child.props.key || `__index_${index}`
            dom.appendChild(pool[key] ? patch(pool[key], child) : render(child, dom))
            delete pool[key]
        })

        for(const key in pool){
            const instance = pool[key].__handlerInstance
            if(instance){
                instance.componentWillUnmount()
            }
            pool[key].remove()
        }

        for(const attr of dom.attributes) dom.removeAttribute(attr.name)
        for(const prop in vdom.props) setAttribute(dom, prop, vdom.props[prop])
        active.focus()
        return dom
    }
}

/**
 * 创建component的方法和属性
 */
class Component{
    constructor(props){
        this.props = props || {}
        this.state = null
    }

    static render(vdom, parent=null){
        const props = Object.assign({}, vdom.props, {children: vdom.children})

        /**
         * 我们render的时候要判断组件类型是否是vdom.type中的某一种
         * 如果是就创建实例并传入props然后渲染组件
         */
        if(Component.isPrototypeOf(vdom.type)){
            const instance = new (vdom.type)(props)
            instance.componentWillMount()
            instance.common = render(instance.render(), parent)
            instance.common.__handlerInstance = instance
            instance.common.__handlerKey = vdom.props.key
            instance.componentDidMount()
            return instance.common
        }else{
            return render(vdom.type(props), parent)
        }
    }

    /**
     * render组件之前的patch过程
     * patch主要通过遍历差异队列完成节点和元素的移除, 创建, 插入
     */
    static patch(dom, vdom, parent=dom.parentNode){
        const props = Object.assign({}, vdom.props, {children: vdom.children})

        if(dom.__handlerInstance && dom.__handlerInstance.constructor === vdom.type){
            dom.__handlerInstance.componentWillReceiveProps(props)
            dom.__handlerInstance.props = props
            return patch(dom, dom.__handlerEvents.render(), parent)
        }else if(Component.isPrototypeOf(vdom.type)){
            const ndom = Component.render(vdom, parent)
            return parent ? (parent.replaceChild(ndom, dom) && ndom) : (ndom)
        }else if(!Component.isPrototypeOf(vdom.type)){
            return patch(dom, vdom.type(props), parent)
        }
    }

    /**
     * setState负责状态的更新
     * 根据新的props或state执行componentWillUpdate和componentDidUpdate重新渲染组件
     */
    setState(nextState){
        if(this.common && this.shouldComponentUpdate(this.props, nextState)){
            const prevState = this.state
            this.componentWillUpdate(this.props, nextState)
            this.common = nextState
            patch(this.common, this.render())
            this.componentDidUpdate(this.props, prevState);
        }else{
            this.state = nextState
        }
    }

    /**
     * 其他生命周期钩子
     */
    shouldComponentUpdate(nextProps, nextState) {
         return nextProps !== this.props || nextState !== this.state
    }

    componentWillReceiveProps(nextProps){
        return undefined
    }

    componentWillUpdate(nextProps, nextState){
        return undefined
    }

    componentDidUpdate(prevProps, prevState){
        return undefined
    }

    componentWillMount(){
        return undefined
    }

    componentDidMount(){
        return undefined
    }

    componentWillUnmount(){
        return undefined
    }
}
