import React, { useState, useRef, useMemo, useEffect } from 'react'
import ScrollableTabView, { DefaultTabBar } from 'react-native-scrollable-tab-view'
import { View, FlatList, Animated } from 'react-native'

const HeaderContainer = ({ scrollOffsetAnimatedValue, children, onLayoutChange }) => {
    const [headerLayoutHeight, setHeaderLayoutHeight] = useState(0)
    const [stickBarLayoutHeight, setStickBarLayoutHeight] = useState(0)
    // TODO headerList must
    const maxScrollOutOfBoundAnimatedOffset = 999
    const maxAnimatedOffset = Math.max(headerLayoutHeight - stickBarLayoutHeight, 0)
    const translateY = scrollOffsetAnimatedValue.interpolate({
        inputRange: [-maxScrollOutOfBoundAnimatedOffset, maxAnimatedOffset],
        outputRange: [maxScrollOutOfBoundAnimatedOffset, -maxAnimatedOffset],
        extrapolate: 'clamp',
    })
    const handleHeaderLayout = ({ nativeEvent }) => {
        const height = nativeEvent.layout.height
        setHeaderLayoutHeight(height)
        onLayoutChange({ height, stickBarHeight: stickBarLayoutHeight })
    }

    const handleStickBarLayout = ({ nativeEvent }) => {
        const stickBarHeight = nativeEvent.layout.height
        setStickBarLayoutHeight(stickBarHeight)
        onLayoutChange({ height: headerLayoutHeight, stickBarHeight })
    }

    return (
        <Animated.View
            style={[{
                position:'absolute',
                left: 0,
                right: 0,
                top: 0,
                zIndex: 1,
                transform: [{ translateY }]
            }]}
            onLayout={handleHeaderLayout}
        >
            {children.slice(0, children.length - 1)}
            <View
                onLayout={handleStickBarLayout}
            >
                {children[children.length - 1]}
            </View>
        </Animated.View>
    )
}

const makeSceneKey = (child, index) => (`${child.props.tabLabel || 'unknown'}-${index}`)
const calcAlterScrollOffset = (
    offset,
    foldableHeaderOffset,
    cachedScrollOffset) => {
        const headerOffset = calcHeaderOffset(offset, foldableHeaderOffset)
        const cachedHeaderOffset = calcHeaderOffset(cachedScrollOffset, foldableHeaderOffset)

        return offset <= foldableHeaderOffset
            ? offset
            : Math.max(cachedScrollOffset + (headerOffset - cachedHeaderOffset), 0)
}

const calcHeaderOffset = (scrollOffset = 0, foldableHeaderOffset) => {
    return Math.min(scrollOffset, foldableHeaderOffset)
}

function StickableTabView ({
    header = null,
    renderTabBar,
    children,
    style,
    initialPage = 0,
}) {
    console.log('render')
    const defaultSceneKey = makeSceneKey(children[initialPage], initialPage)

    // header's height and stickBar's height is dymanic
    const [[headerHeight, stickBarHeight], setHeaderLayoutHeight] = useState([0, 0])
    const handleHeaderLayoutChange = ({ height, stickBarHeight }) => {
        setHeaderLayoutHeight([height, stickBarHeight])
    }
    // header's max offset
    const foldableHeaderOffset = Math.max(headerHeight - stickBarHeight, 0)

    // for lazy render scene content
    const visitedSceneKeysRef = useRef({ [defaultSceneKey]: true })
    const isVisited = (sceneKey) => {
        return visitedSceneKeysRef.current[sceneKey] !== undefined
    }
    const addVisitedSceneKey = (sceneKey) => {
        visitedSceneKeysRef.current[sceneKey] = true
    }

    // sync header offset for diff scene via scrollTop
    const scrollNodesRef = useRef({})
    const setScrollNodesRef = (sceneKey, node) => {
        scrollNodesRef.current[sceneKey] = node
    }

    const alterScrollOffsetMapRef = useRef({})
    const cachedScrollOffsetMapRef = useRef({})
    const scrollOffsetAnimatedValueRef = useRef(new Animated.Value(0))
    const activeSceneKeyRef = useRef(defaultSceneKey)

    const handleScrollStopInternal = (handlingSceneKey, offset) => {
        const scrollNodeSceneKeys = Object.keys(scrollNodesRef.current)
        scrollNodeSceneKeys.forEach((sceneKey) => {
            if (sceneKey === handlingSceneKey) {
                alterScrollOffsetMapRef.current[sceneKey] = offset
            } else {
                alterScrollOffsetMapRef.current[sceneKey] = 
                calcAlterScrollOffset(
                    offset,
                    foldableHeaderOffset,
                    cachedScrollOffsetMapRef.current[sceneKey] || 0)
            }
        })

        console.log('cached', cachedScrollOffsetMapRef.current)
        console.log('new', alterScrollOffsetMapRef.current)
        scrollNodeSceneKeys.forEach((sceneKey) => {
            // not scroll target that response to scroll event
            if (handlingSceneKey === sceneKey) {
                return
            }

            const node = scrollNodesRef.current[sceneKey]
            if (node) {
                console.log('scroll to', sceneKey, alterScrollOffsetMapRef.current[sceneKey])
                // scrollToOffset will trigger onScroll event                
                node.scrollToOffset({
                    animated: false,
                    offset: alterScrollOffsetMapRef.current[sceneKey],
                })
            }
        })
    }
    const handleScrollStop = (sceneKey) => {
        let timerHandler = null
        return function (e) {
            // The purpose of debounds is to aviod affect header's transform
            // since `scrollToOffset` caused frequent onScroll event response.
            if (activeSceneKeyRef.current !== sceneKey) {
                // only handle active scene list's onScroll event
                return
            }

            // react-native cann't conditional Animated.event
            // reduce the number of times the scroll event is triggered via debounds
            if (timerHandler !== null) {
                clearTimeout(timerHandler)
            }
            // nativeEvent can only access synchronously
            const { nativeEvent } = e
            const offset = nativeEvent.contentOffset.y

            // 100ms is the ideal interval for 2 consecutive operations
            timerHandler = setTimeout(() => {
                handleScrollStopInternal(sceneKey, offset)
            }, 100)
        }
    }

    const [TabBar, rerenderTabBar] = useMemo(() => withDirect(renderTabBar), [renderTabBar])
    
    // 考虑性能 通道渲染 children
    const childrenOriginNodeTypeMapRef = useRef({})
    const childrenNodeTypeMapRef = useRef({})
    const rerenderChildrenNodeMapRef = useRef({})
    ;(children || []).forEach((child, index) => {
        const sceneKey = makeSceneKey(child, index)
        const currentNodeType = child.type
        const prevNodeType = childrenOriginNodeTypeMapRef.current[sceneKey]
        childrenOriginNodeTypeMapRef.current[sceneKey] = currentNodeType

        if (!Object.is(currentNodeType, prevNodeType)) {
            const AnimatedVirtualizedList = Animated[currentNodeType.name]
            const [node, rerender] = withDirect(AnimatedVirtualizedList)
            childrenNodeTypeMapRef.current[sceneKey] = node
            rerenderChildrenNodeMapRef.current[sceneKey] = () => {
                const currentOffset = alterScrollOffsetMapRef.current[sceneKey]
                const cachedOffset = cachedScrollOffsetMapRef.current[sceneKey] || 0
                const y = calcAlterScrollOffset(currentOffset, foldableHeaderOffset, cachedOffset)
                // TODO: y is wrong
                rerender({
                    contentOffset: { y }
                })
            }
        }
    })

    const _rerenderChildrenOfVisitedTabs = (sceneKey) => {
        const isPrevVisited = isVisited(sceneKey)
        if (!isPrevVisited) {
            addVisitedSceneKey(sceneKey)

            const rerender = rerenderChildrenNodeMapRef.current[sceneKey]
            if (rerender) {
                rerender()
            }
        }
    }
    const _renderChildren = () => (
        React.Children.map(children, (child, index) => {
            // if (!isVisited(makeSceneKey(child, index))) {
            //     return <View {...child.props} />
            // }

            const sceneKey = makeSceneKey(child, index)
            const handleScroll = handleScrollStop(sceneKey)

            // const AnimatedVirtualizedList = Animated[child.type.name]

            // const isPrerender = defaultSceneKey === sceneKey
            // const [DirectAnimatedVirtualizedList, rerenderRef] = useMemo(
            //     () => (withDirect(AnimatedVirtualizedList, isPrerender)),
            //     [AnimatedVirtualizedList, isPrerender]
            // )
            // rerenderChildrenRef.current[sceneKey] = () => {
            //     // const y = _getScrollOffset(sceneKey)
            //     // console.log('yyyy', y)
            //     // todo
            //     rerenderRef.current({
            //         contentOffset: { y: 200 }
            //     })
            // }
            const DirectAnimatedVirtualizedList = childrenNodeTypeMapRef.current[sceneKey] || Animated[child.type.name]
            console.log('DirectAnimatedVirtualizedList', DirectAnimatedVirtualizedList)
            return (
                (
                    <DirectAnimatedVirtualizedList
                        {...child.props}
                        ref={(node) => {
                            // todo check ref api
                            // child.props.ref(node)
                            console.log('ref xx', node)
                            // set scrollNodes
                            setScrollNodesRef(sceneKey, node ? node._component : null)
                        }}

                        ListHeaderComponent={
                            <View
                                style={{
                                    height: headerHeight,
                                }}
                            />
                        }
                        scrollEventThrottle={16}
                        onScroll={
                            Animated.event(
                                [{ nativeEvent: {
                                    contentOffset: {
                                        y: scrollOffsetAnimatedValueRef.current
                                    },
                                } }],
                                {
                                    useNativeDriver: true,
                                    listener: (e) => {
                                        // proxy onScroll
                                        if (child.props.onScroll) {
                                            child.props.onScroll()
                                        }
                                        console.log('evt', e.nativeEvent)
                                        handleScroll(e)
                                    }
                                }
                            )
                        }
                    />
                )
            )
        })
    )

    useEffect(() => {
        // render default scene
        const renderDefaultChild = rerenderChildrenNodeMapRef.current[defaultSceneKey]
        if (renderDefaultChild) {
            renderDefaultChild()
        }
    }, [])
    return (
    <View
        style={{
            ...style,
            position: 'relative',
            flexGrow: 1,
        }}
    >
        <HeaderContainer
            scrollOffsetAnimatedValue={scrollOffsetAnimatedValueRef.current}
            onLayoutChange={handleHeaderLayoutChange}        
        >
            {header}
            <TabBar />
        </HeaderContainer>
        
        <ScrollableTabView
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
            renderTabBar={(props) => { rerenderTabBar(props); return <View />; }}
            initialPage={initialPage}
            onChangeTab={({ i, ref }) => {
                const lastSceneKey = activeSceneKeyRef.current
                cachedScrollOffsetMapRef.current[lastSceneKey] = alterScrollOffsetMapRef.current[lastSceneKey]

                const activeSceneKey = makeSceneKey(ref, i)
                activeSceneKeyRef.current = activeSceneKey

                _rerenderChildrenOfVisitedTabs(activeSceneKey)
            }}
        >
            {_renderChildren()}
        </ScrollableTabView>
    </View>
    )
}

export default StickableTabView

function withDirect (WrapedComponment, prerender = false) {
    let shouldRender = false
    // TODO: if component's render after call rerender
    const rerenderRef = {
        current: () => { console.log('listen') }
    }
    return [
        React.forwardRef(function (props = {}, refx) {
            const [supplementProps, setSupplementProps] = useState({})
            const lastSupplementPropsRef = useRef(supplementProps)

            let alterProps = {}
            if (lastSupplementPropsRef.current === supplementProps) {
                // rerender without call rerender funciton
                alterProps = { ...supplementProps, ...props }
            } else {
                lastSupplementPropsRef.current = supplementProps
                alterProps = { ...props, ...supplementProps }
            }

            rerenderRef.current = (externalProps = {}) => {
                shouldRender = true
                console.log('listen iner')
                console.log('externalProps', externalProps)
                setSupplementProps({ ...externalProps })
            }
            const isRender = (prerender || shouldRender)
            console.log('listen alterProps', alterProps)

            return isRender ? <WrapedComponment {...alterProps} ref={refx} /> : null
        }),
        (...args) => {
            rerenderRef.current(...args)
        },
    ]
}
