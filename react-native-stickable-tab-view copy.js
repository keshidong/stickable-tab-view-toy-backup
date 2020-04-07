import React, { useState, useRef, useMemo } from 'react'
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
                top: -headerLayoutHeight,
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

function StickableTabView ({
    header = null,
    renderTabBar,
    children,
    style,
    initialPage = 0,
}) {
    console.log('render')
    const [[headerHeight, stickBarHeight], setHeaderLayoutHeight] = useState([0, 0])
    const handleHeaderLayoutChange = ({ height, stickBarHeight }) => {
        setHeaderLayoutHeight([height, stickBarHeight])
    }

    const foldableHeaderOffset = Math.max(headerHeight - stickBarHeight, 0)

    const scrollNodesRef = useRef({})
    const scrollOffsetMapRef = useRef({})
    const cachedScrollOffsetMapRef = useRef({})
    const scrollOffsetAnimatedValueRef = useRef(new Animated.Value(0))
    const activeSceneKeyRef = useRef(makeSceneKey(children[initialPage], initialPage))

    const handleScrollStopInternal = (handlingSceneKey, offset) => {
        const scrollNodeSceneKeys = Object.keys(scrollNodesRef.current)
        scrollNodeSceneKeys.forEach((sceneKey) => {
            if (sceneKey === handlingSceneKey) {
                scrollOffsetMapRef.current[sceneKey] = offset
            } else {
                const headerOffset = Math.min(offset, foldableHeaderOffset)
                const cachedScrollOffset = cachedScrollOffsetMapRef.current[sceneKey] || 0

                const cachedHeaderOffset = Math.min(cachedScrollOffset, foldableHeaderOffset)
                console.log('foldableHeaderOffset', foldableHeaderOffset)

                scrollOffsetMapRef.current[sceneKey] = 
                offset <= foldableHeaderOffset
                    ? offset
                    : Math.max(cachedScrollOffset + (headerOffset - cachedHeaderOffset), 0)
            }
        })

        console.log('cached', cachedScrollOffsetMapRef.current)
        console.log('new', scrollOffsetMapRef.current)
        scrollNodeSceneKeys.forEach((sceneKey) => {
            if (handlingSceneKey === sceneKey) {
                return
            }

            const currentScrollNode = scrollNodesRef.current[sceneKey]

            if (currentScrollNode) {
                console.log('scroll to', sceneKey, scrollOffsetMapRef.current[sceneKey])
                // 防抖 TODO
                // currentScrollNode.scrollToOffset({
                //     animated: false,
                //     offset: scrollOffsetMapRef.current[sceneKey],
                // })
            }
        })
    }
    const handleScrollStop = (sceneKey) => {
        let timerHandler = null
        return function (e) {
            // 去除其他FlatList scroll影响

            console.log(activeSceneKeyRef.current)

            if (activeSceneKeyRef.current !== sceneKey) {
                return
            }

            if (timerHandler !== null) {
                clearTimeout(timerHandler)
            }
            // todo: scrollToOffset will trigger onScroll event?
            const { nativeEvent } = e
            const offset = nativeEvent.contentOffset.y

            timerHandler = setTimeout(() => {
                handleScrollStopInternal(sceneKey, offset)
            }, 100)
            
        }
    }

    const [TabBar, listenPropsChangeRef] = useMemo(() => withDirect(renderTabBar), [renderTabBar])
    return (
    <View
        style={{
            ...style,
            position: 'relative',
            flexGrow: 1,
            // height: '100%'
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
                // height: '100%',
                bottom: 0,
            }}
            renderTabBar={(props) => { listenPropsChangeRef.current(props); return <View />; }}
            initialPage={initialPage}
            onChangeTab={({ i, ref }) => {
                const lastSceneKey = activeSceneKeyRef.current
                cachedScrollOffsetMapRef.current[lastSceneKey] = scrollOffsetMapRef.current[lastSceneKey]

                activeSceneKeyRef.current = makeSceneKey(ref, i)
            }}
        >
            {
                React.Children.map(children, (child, index) => {
                    const handleScroll = handleScrollStop(makeSceneKey(child, index))
                    const AnimatedScrollView = Animated[child.type.name]
                    return (
                        (
                            <AnimatedScrollView
                                {...child.props}
                                ref={(node) => {
                                    // todo check ref api
                                    // child.props.ref(node)
                                    scrollNodesRef.current[makeSceneKey(child, index)] = node ? node._component : null
                                }}
                                style={{
                                    ...child.props.style,
                                    // paddingTop: headerHeight,
                                }}
                                contentInset={{ top: headerHeight }}
                                // ListHeaderComponent={
                                //     <View>
                                //         <View
                                //             style={{
                                //                 height: headerHeight,
                                //             }}
                                //         />
                                //         {/* // todo check ListHeaderComponent api */}
                                //         {/* {child.props.ListHeaderComponent} */}
                                //     </View>
                                // }
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
            }
        </ScrollableTabView>
    </View>
    )
}

export default StickableTabView

function withDirect (WrapedComponment) {
    let shouldRender = false
    const listenRef = { current: () => { console.log('listen') } }
    return [
        function (props = {}) {
            const [alterProps, setAlterProps] = useState({})
            listenRef.current = (externalProps) => {
                shouldRender = true
                console.log('listen iner')
                console.log('externalProps', externalProps)
                setAlterProps({ ...props, ...externalProps })
            }
            console.log('listen alterProps', alterProps)
            return shouldRender ? <WrapedComponment {...alterProps} /> : null
        },
        listenRef,
    ]
}
